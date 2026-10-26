import { expect, it } from 'vitest';
import { Group } from '../../src/domain/Group.js';
import { Line } from '../../src/domain/Line.js';
import { Rect } from '../../src/domain/Rect.js';
import { SvgDocument } from '../../src/domain/SvgDocument.js';
import { Text } from '../../src/domain/Text.js';

it('constructs the assignment flowchart through domain APIs and moves only node2', () => {
  const doc = new SvgDocument();
  doc.insert(new Group('flowchart'));
  doc.insert(new Group('node1'), 'flowchart');
  doc.insert(new Rect('start', 120, 100, 160, 60, { fill: '#4a90d9' }), 'node1');
  doc.insert(new Text('start-label', 155, 135, '开始'), 'node1');
  doc.insert(new Group('node2'), 'flowchart');
  const process = new Rect('process', 520, 100, 160, 60, { fill: '#f5a623' });
  const label = new Text('process-label', 545, 135, '处理数据');
  const line = new Line('arrow1', 280, 130, 520, 130, { stroke: 'black' });
  doc.insert(process, 'node2');
  doc.insert(label, 'node2');
  doc.insert(line, 'flowchart');

  doc.require('node2').move(0, 100);

  expect([process.x, process.y, process.width, process.height]).toEqual([520, 200, 160, 60]);
  expect([label.x, label.y, label.text]).toEqual([545, 235, '处理数据']);
  expect(doc.require('start').attributes).toEqual({ x: 120, y: 100, width: 160, height: 60, fill: '#4a90d9' });
  expect(doc.require('start-label').attributes).toEqual({ x: 155, y: 135, text: '开始' });
  expect(line.attributes).toEqual({ x1: 280, y1: 130, x2: 520, y2: 130, stroke: 'black' });
  expect(doc.require('flowchart').children.map(shape => shape.id)).toEqual(['node1', 'node2', 'arrow1']);
  expect(doc.require('node2').children).toEqual([process, label]);
  expect(process.parent).toBe(doc.require('node2'));
  expect(line.parent).toBe(doc.require('flowchart'));
});
