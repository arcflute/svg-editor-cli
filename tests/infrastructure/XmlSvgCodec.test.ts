import { describe, expect, it } from 'vitest';
import { ShapeFactory } from '../../src/domain/ShapeFactory.js';
import { SvgDocument } from '../../src/domain/SvgDocument.js';
import { XmlSvgCodec } from '../../src/infrastructure/XmlSvgCodec.js';
import { Group } from '../../src/domain/Group.js';
import { Rect } from '../../src/domain/Rect.js';
import { Text } from '../../src/domain/Text.js';

const factory = new ShapeFactory();
const codec = new XmlSvgCodec(factory);
const wrap = (body: string, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" ${extra}>${body}</svg>`;

describe('SVG codec', () => {
  it('round-trips six real classes, geometry, order, absent/explicit styles, and exact XML text', () => {
    const special = ' 中文 & < > " \' \r\n\t 😀 ';
    const group = factory.create('g', 'g', { fill: 'blue', 'stroke-width': 0 }, [
      factory.create('rect', 'r', { x: -1.5, y: 2, width: 3, height: 4 }),
      factory.create('circle', 'c', { cx: 5, cy: 6, r: 7, fill: 'none' }),
      factory.create('ellipse', 'e', { cx: 8, cy: 9, rx: 10, ry: 11 }),
      factory.create('line', 'l', { x1: 12, y1: 13, x2: 14, y2: 15, stroke: '#ff00ff' }),
      factory.create('text', 't', { x: 16, y: 17, text: special }),
      factory.create('g', 'empty'),
    ]);
    const document = new SvgDocument(640.5, 480, [group]);
    const xml = codec.encode(document);
    expect(xml).toContain('viewBox="0 0 640.5 480"');
    expect(xml).toContain('&amp; &lt; &gt; &quot; &apos; &#13;&#10;&#9;');
    expect(xml).not.toContain(' text=');
    const copy = codec.decode(xml);
    expect(copy.warnings).toEqual([]);
    expect(copy.document.width).toBe(640.5);
    expect(copy.document.roots.map(shape => shape.toElement())).toEqual(document.roots.map(shape => shape.toElement()));
    for (const id of ['g', 'r', 'c', 'e', 'l', 't', 'empty']) {
      expect(copy.document.require(id).constructor).toBe(document.require(id).constructor);
      expect(copy.document.require(id)).not.toBe(document.require(id));
    }
    expect(copy.document.require('r').style).toEqual({});
    expect(copy.document.require('c').fill).toBe('none');
    copy.document.require('g').move(1, 2);
    expect(copy.document.require('t').attributes).toMatchObject({ x: 17, y: 19, text: special });
    expect(copy.document.require('r').parent).toBe(copy.document.require('g'));
  });

  it('reserves explicit IDs across the entire input before generating per-tag IDs', () => {
    const result = codec.decode(wrap('<g><rect x="0" y="0" width="1" height="2"/><g id="g1"><rect id="rect1" x="3" y="4" width="5" height="6"/><rect x="0" y="0" width="1" height="2"/></g></g>'));
    expect(result.warnings).toEqual(['warning: assigned id g2 to unnamed <g>', 'warning: assigned id rect2 to unnamed <rect>', 'warning: assigned id rect3 to unnamed <rect>']);
    expect(result.document.require('g2').children.map(shape => shape.id)).toEqual(['rect2', 'g1']);
    expect(result.document.elementCount).toBe(5);
  });

  it('accepts namespace prefixes, comments, CDATA, entities, empty text, and case-sensitive IDs', () => {
    const result = codec.decode('<s:svg xmlns:s="http://www.w3.org/2000/svg"><!-- ignored --><s:text id="A" x="0" y="0"><![CDATA[<原文>]]>&amp;</s:text><s:text id="a" x="1" y="2"/></s:svg>');
    expect(result.document.require('A').attributes.text).toBe('<原文>&');
    expect(result.document.require('a').attributes.text).toBe('');
    expect(result.document.width).toBe(800);
  });

  it('degrades the future box marker to ordinary g with a warning', () => {
    const result = codec.decode(wrap('<g id="b" data-kind="box"><text id="t" x="0" y="0">hi</text></g>'));
    expect(result.document.require('b')).toBeInstanceOf(Group);
    expect(result.warnings).toEqual(['warning: imported box b as ordinary g']);
    expect(codec.encode(result.document)).not.toContain('data-kind');
  });

  it.each([
    ['', 'invalid XML'], ['<svg>', 'invalid XML'], ['<svg/><svg/>', 'invalid XML'],
    ['<html/>', 'expected SVG root'], ['<svg xmlns="urn:foreign"/>', 'unsupported namespace'],
    ['<!DOCTYPE svg [<!ENTITY x "boom">]><svg/>', 'DOCTYPE'],
    ['<?xml-stylesheet href="x"?><svg/>', 'processing instructions'],
    ['<?xml version="1.1"?><svg/>', 'only XML 1.0'],
    ['<?xml version="1.0" encoding="UTF-16"?><svg/>', 'UTF-8'],
    [wrap('<g id="a"/><g id="a"/>'), 'id already exists: a'],
    [wrap('<g id=" "/>'), 'id must not be empty'],
    [wrap('<g transform="translate(1,2)"/>'), 'unknown attribute: transform'],
    [wrap('<path/>'), 'unknown shape type: path'], [wrap('<svg/>'), 'unknown shape type: svg'],
    [wrap('<text x="0" y="0" font-size="20">hi</text>'), 'unknown attribute: font-size'],
    [wrap('<g style="fill: red"/>'), 'unknown attribute: style'],
    [wrap('<g onclick="bad()"/>'), 'unknown attribute: onclick'],
    [wrap('<g data-kind="unknown"/>'), 'unsupported data-kind'],
    [wrap('<rect x="0" y="0" width="1" height="2"><g/></rect>'), 'not a container'],
    [wrap('<text x="0" y="0" text="attribute"/>'), 'XML text node'],
    [wrap('<g>unmodeled text</g>'), 'unexpected text'],
    [wrap('<g id="a" id="b"/>'), 'invalid XML'],
    [wrap('<text x="0" y="0">&unknown;</text>'), 'invalid XML'],
    [wrap('<rect x="0" y="0" width="-1" height="2"/>'), 'non-negative'],
    [wrap('<circle cx="NaN" cy="0" r="1"/>'), 'finite number'],
    [wrap('<rect width="10" height="10"/>'), 'finite number'],
    [wrap('', 'viewBox="1 0 800 600"'), 'unsupported viewBox'],
    [wrap('', 'viewBox="0 0 400 300"'), 'unsupported viewBox'],
    [wrap('', 'fill="red"'), 'unsupported SVG root attribute'],
  ])('rejects unsupported or malformed input: %s', (xml, message) => {
    expect(() => codec.decode(xml)).toThrow(message);
  });

  it.each(['\u0000', '\u0001', '\uD800', '\uFFFF'])('rejects XML-invalid text at save, not in the domain: %s', value => {
    const document = new SvgDocument(1, 1, [new Text('t', 0, 0, value)]);
    expect(document.require('t').attributes.text).toBe(value);
    expect(() => codec.encode(document)).toThrow('not allowed in XML 1.0');
  });

  it('does not adopt factory input children when a parent attribute fails validation', () => {
    const child = new Rect('child', 0, 0, 1, 1);
    expect(() => factory.create('g', 'g', { invalid: 1 }, [child])).toThrow();
    expect(child.parent).toBeNull();
  });
});
