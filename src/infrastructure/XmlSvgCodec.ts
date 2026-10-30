import { SaxesParser } from 'saxes';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import { SvgDocument } from '../domain/SvgDocument.js';
import { InputError } from '../application/InputError.js';
import type { Shape } from '../domain/Shape.js';
import type { ShapeElement } from '../domain/ShapeElement.js';
import type { SvgCodec } from '../application/SvgCodec.js';
import type { XmlElement } from './XmlElement.js';

export class XmlSvgCodec implements SvgCodec {
  private static readonly namespace = 'http://www.w3.org/2000/svg';
  public constructor(private readonly factory: ShapeFactory) {}

  public decode(xml: string): Readonly<{ document: SvgDocument; warnings: readonly string[] }> {
    const root = this.parse(xml);
    if (root.name !== 'svg') throw new InputError('expected SVG root element');
    for (const name of Object.keys(root.attributes)) {
      if (!['width', 'height', 'viewBox'].includes(name)) throw new InputError(`unsupported SVG root attribute: ${name}`);
    }
    const width = this.number(root.attributes.width ?? '800', 'width');
    const height = this.number(root.attributes.height ?? '600', 'height');
    if (root.text.trim() !== '') throw new InputError('unexpected text in SVG root');
    if (root.attributes.viewBox !== undefined) {
      const box = root.attributes.viewBox.trim().split(/[\s,]+/).map(value => this.number(value, 'viewBox'));
      if (box.length !== 4 || box[0] !== 0 || box[1] !== 0 || box[2] !== width || box[3] !== height) {
        throw new InputError('unsupported viewBox: expected 0 0 width height');
      }
    }
    const reserved = new Set<string>();
    const reserve = (node: XmlElement): void => {
      const id = node.attributes.id;
      if (id !== undefined) {
        if (id.trim() === '') throw new InputError('id must not be empty');
        if (reserved.has(id)) throw new InputError(`id already exists: ${id}`);
        reserved.add(id);
      }
      node.children.forEach(reserve);
    };
    root.children.forEach(reserve);
    const counters = new Map<string, number>();
    const warnings: string[] = [];
    const construct = (node: XmlElement): Shape => {
      const description = this.factory.describe(node.name);
      let id = node.attributes.id;
      if (id === undefined) {
        let number = counters.get(node.name) ?? 1;
        do { id = `${node.name}${number++}`; } while (reserved.has(id));
        counters.set(node.name, number);
        reserved.add(id);
        warnings.push(`warning: assigned id ${id} to unnamed <${node.name}>`);
      }
      const textParameter = description.parameters.find(parameter => parameter.kind === 'text');
      const numbers = new Set(description.parameters.filter(parameter => parameter.kind === 'number').map(parameter => parameter.attribute));
      numbers.add('stroke-width');
      const attributes: Record<string, string | number> = Object.create(null) as Record<string, string | number>;
      for (const [key, value] of Object.entries(node.attributes)) {
        if (key === 'id' || key === 'data-kind') continue;
        if (key === textParameter?.attribute) throw new InputError(`text content must be an XML text node: ${id}`);
        attributes[key] = numbers.has(key) ? this.number(value, key) : value;
      }
      if (textParameter !== undefined) attributes[textParameter.attribute] = node.text;
      else if (node.text.trim() !== '') throw new InputError(`unexpected text in <${node.name}>`);
      const shape = this.factory.create(node.name, id, attributes, node.children.map(construct));
      if (node.attributes['data-kind'] !== undefined) {
        if (!shape.isContainer || node.attributes['data-kind'] !== 'box') throw new InputError(`unsupported data-kind: ${node.attributes['data-kind']}`);
        warnings.push(`warning: imported box ${id} as ordinary g`);
      }
      return shape;
    };
    const document = new SvgDocument(width, height, root.children.map(construct));
    return Object.freeze({ document, warnings: Object.freeze(warnings) });
  }

  public encode(document: SvgDocument): string {
    const elements = document.roots.map(shape => this.writeElement(shape.toElement(), 1)).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="${XmlSvgCodec.namespace}" width="${document.width}" height="${document.height}" viewBox="0 0 ${document.width} ${document.height}">\n${elements}${elements ? '\n' : ''}</svg>\n`;
  }

  private parse(xml: string): XmlElement {
    const roots: XmlElement[] = [];
    const stack: XmlElement[] = [];
    const parser = new SaxesParser({ xmlns: true, defaultXMLVersion: '1.0', forceXMLVersion: true });
    parser.on('error', error => { throw new InputError(`invalid XML: ${error.message}`); });
    parser.on('doctype', () => { throw new InputError('DOCTYPE is not supported'); });
    parser.on('processinginstruction', () => { throw new InputError('XML processing instructions are not supported'); });
    parser.on('xmldecl', declaration => {
      if (declaration.version !== '1.0' || (declaration.encoding && declaration.encoding.toUpperCase() !== 'UTF-8')) {
        throw new InputError('only XML 1.0 with UTF-8 encoding is supported');
      }
    });
    parser.on('opentag', tag => {
      if (tag.uri !== '' && tag.uri !== XmlSvgCodec.namespace) throw new InputError(`unsupported namespace: ${tag.uri}`);
      const attributes: Record<string, string> = Object.create(null) as Record<string, string>;
      for (const attribute of Object.values(tag.attributes)) {
        if (attribute.uri === 'http://www.w3.org/2000/xmlns/') continue;
        if (attribute.uri !== '') throw new InputError(`unsupported attribute namespace: ${attribute.name}`);
        attributes[attribute.local] = attribute.value;
      }
      const node: XmlElement = { name: tag.local, attributes, children: [], text: '' };
      (stack.at(-1)?.children ?? roots).push(node);
      stack.push(node);
    });
    parser.on('closetag', () => { stack.pop(); });
    const append = (text: string): void => {
      const current = stack.at(-1);
      if (current !== undefined) current.text += text;
    };
    parser.on('text', append);
    parser.on('cdata', append);
    parser.write(xml).close();
    if (roots.length !== 1) throw new InputError('expected one SVG root element');
    return roots[0]!;
  }

  private writeElement(element: ShapeElement, depth: number): string {
    const indent = '  '.repeat(depth);
    const attributes = Object.entries(element.attributes).map(([name, value]) => `${name}="${this.escape(String(value))}"`).join(' ');
    const start = `${indent}<${element.name} ${attributes}`;
    if (element.text !== undefined) return `${start}>${this.escape(element.text)}</${element.name}>`;
    if (element.children.length === 0) return `${start}/>`;
    return `${start}>\n${element.children.map(child => this.writeElement(child, depth + 1)).join('\n')}\n${indent}</${element.name}>`;
  }

  private escape(value: string): string {
    if (/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/u.test(value)) {
      throw new InputError('value contains a character not allowed in XML 1.0');
    }
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll("'", '&apos;')
      .replaceAll('\r', '&#13;').replaceAll('\n', '&#10;').replaceAll('\t', '&#9;');
  }

  private number(value: string, name: string): number {
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim()) || !Number.isFinite(Number(value))) {
      throw new InputError(`${name} must be a finite number`);
    }
    return Number(value);
  }
}
