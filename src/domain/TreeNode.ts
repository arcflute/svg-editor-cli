import { DomainError } from './DomainError.js';
import { Validation } from './Validation.js';

/** Structural implementation shared by shapes and the ID-less document root. */
export abstract class TreeNode {
  #parent: TreeNode | null = null;
  #children: TreeNode[] = [];
  #document: TreeNode | null = null;
  #index: Map<string, TreeNode> | null = null;

  protected abstract get nodeId(): string | undefined;

  protected get acceptsChildren(): boolean { return false; }
  protected get parentNode(): TreeNode | null { return this.#parent; }
  protected get childNodes(): readonly TreeNode[] { return Object.freeze([...this.#children]); }

  protected initializeRoot(children: readonly TreeNode[] = []): void {
    if (this.nodeId !== undefined || !this.acceptsChildren || this.#document !== null) {
      throw new DomainError('INVALID_ROOT', 'invalid document root');
    }
    const index = new Map<string, TreeNode>();
    for (const child of children) {
      this.assertDetached(child);
      for (const descendant of this.collect(child)) {
        const id = descendant.nodeId;
        if (id === undefined) throw new DomainError('INVALID_ROOT', 'a document cannot be inserted as a shape');
        if (index.has(id)) throw new DomainError('DUPLICATE_ID', `id already exists: ${id}`);
        index.set(id, descendant);
      }
    }
    const roots = [...children];
    for (const child of roots) child.#parent = this;
    for (const descendant of index.values()) descendant.#document = this;
    this.#children = roots;
    this.#document = this;
    this.#index = index;
  }

  /** Detached trees may contain duplicate IDs; document insertion validates IDs globally. */
  protected initializeChildren(children: readonly TreeNode[]): void {
    if (!this.acceptsChildren || this.#document !== null || this.#parent !== null || this.#children.length !== 0) {
      throw new DomainError('INVALID_STRUCTURE', 'children can only be initialized on a detached container');
    }
    const seen = new Set<TreeNode>();
    for (const child of children) {
      this.assertDetached(child);
      if (child === this || seen.has(child)) {
        throw new DomainError('ALREADY_ATTACHED', 'a node cannot appear more than once');
      }
      // Distinct detached roots cannot share descendants: each node already has one parent.
      seen.add(child);
    }
    const nextChildren = [...children];
    for (const child of nextChildren) child.#parent = this;
    this.#children = nextChildren;
  }

  protected findNode(id: string): TreeNode | undefined {
    return this.requireIndex().get(id);
  }

  /** Prepare the complete restructuring before changing any links, order or index. */
  protected groupNodes(group: TreeNode, selection: readonly TreeNode[]): void {
    const index = this.requireIndex();
    this.assertDetached(group);
    if (!group.acceptsChildren || group.#children.length !== 0) {
      throw new DomainError('INVALID_GROUP', 'grouping requires an empty detached container');
    }
    if (index.has(group.nodeId!)) throw new DomainError('DUPLICATE_ID', `id already exists: ${group.nodeId}`);
    if (selection.length === 0) throw new DomainError('EMPTY_SELECTION', 'group requires at least one shape');
    const selected = new Set(selection);
    if (selected.size !== selection.length) throw new DomainError('DUPLICATE_SELECTION', 'duplicate shape in group selection');
    for (const node of selection) {
      this.assertOwned(node);
      for (let ancestor = node.#parent; ancestor !== null; ancestor = ancestor.#parent) {
        if (selected.has(ancestor)) {
          throw new DomainError('CYCLE', `cannot group a container into its own descendant: ${ancestor.nodeId}`);
        }
      }
    }
    let parent = selection[0]!.#parent!;
    while (!selection.every(node => {
      for (let ancestor = node.#parent; ancestor !== null; ancestor = ancestor.#parent) {
        if (ancestor === parent) return true;
      }
      return false;
    })) parent = parent.#parent!;
    const ordered: TreeNode[] = [];
    const visit = (node: TreeNode): void => {
      if (selected.has(node)) ordered.push(node);
      for (const child of node.#children) visit(child);
    };
    visit(parent);
    const branches = new Set(selection.map(node => {
      let branch = node;
      while (branch.#parent !== parent) branch = branch.#parent!;
      return branch;
    }));
    const nextChildren = new Map<TreeNode, TreeNode[]>();
    for (const node of selection) nextChildren.set(node.#parent!, node.#parent!.#children.filter(child => !selected.has(child)));
    const siblings: TreeNode[] = [];
    let inserted = false;
    for (const child of parent.#children) {
      if (!inserted && branches.has(child)) { siblings.push(group); inserted = true; }
      if (!selected.has(child)) siblings.push(child);
    }
    nextChildren.set(parent, siblings);
    const nextIndex = new Map(index);
    nextIndex.set(group.nodeId!, group);
    // Commit only precomputed values; no validation or callbacks below.
    for (const [owner, children] of nextChildren) owner.#children = children;
    group.#children = ordered;
    group.#parent = parent;
    group.#document = this;
    for (const node of ordered) node.#parent = group;
    this.#index = nextIndex;
  }

  protected ungroupNode(group: TreeNode): void {
    const index = this.requireIndex();
    this.assertContainer(group);
    const parent = group.#parent;
    if (parent === this) throw new DomainError('TOP_LEVEL_GROUP', `cannot ungroup top-level container: ${group.nodeId}`);
    if (parent === null) throw new DomainError('INVALID_ROOT', 'cannot ungroup the document root');
    const promoted = [...group.#children];
    const siblings = parent.#children.flatMap(child => child === group ? promoted : [child]);
    const nextIndex = new Map(index);
    nextIndex.delete(group.nodeId!);
    parent.#children = siblings;
    for (const child of promoted) child.#parent = parent;
    group.#children = [];
    group.#parent = null;
    group.#document = null;
    this.#index = nextIndex;
  }

  protected insertNode(node: TreeNode, parent: TreeNode, position?: number): void {
    const currentIndex = this.requireIndex();
    this.assertContainer(parent);
    this.assertDetached(node);
    const at = Validation.position(position ?? parent.#children.length, parent.#children.length);
    const descendants = this.collect(node);
    const nextIndex = new Map(currentIndex);
    for (const descendant of descendants) {
      const id = descendant.nodeId;
      if (id === undefined) throw new DomainError('INVALID_ROOT', 'a document cannot be inserted as a shape');
      if (nextIndex.has(id)) throw new DomainError('DUPLICATE_ID', `id already exists: ${id}`);
      nextIndex.set(id, descendant);
    }
    const nextChildren = [...parent.#children];
    nextChildren.splice(at, 0, node);
    // No validation or user callbacks after this point.
    parent.#children = nextChildren;
    node.#parent = parent;
    for (const descendant of descendants) descendant.#document = this;
    this.#index = nextIndex;
  }

  protected removeNode(node: TreeNode): void {
    const currentIndex = this.requireIndex();
    this.assertOwned(node);
    const parent = node.#parent;
    if (parent === null) throw new DomainError('INVALID_ROOT', 'cannot remove the document root');
    const descendants = this.collect(node);
    const nextIndex = new Map(currentIndex);
    for (const descendant of descendants) nextIndex.delete(descendant.nodeId!);
    const nextChildren = parent.#children.filter(child => child !== node);
    parent.#children = nextChildren;
    node.#parent = null;
    for (const descendant of descendants) descendant.#document = null;
    this.#index = nextIndex;
  }

  /** Position is the final index in the destination after removal from the old parent. */
  protected reparentNode(node: TreeNode, parent: TreeNode, position?: number): void {
    this.requireIndex();
    this.assertOwned(node);
    this.assertContainer(parent);
    for (let ancestor: TreeNode | null = parent; ancestor !== null; ancestor = ancestor.#parent) {
      if (ancestor === node) throw new DomainError('CYCLE', 'cannot move a container into itself or its descendant');
    }
    const previousParent = node.#parent;
    if (previousParent === null) throw new DomainError('INVALID_ROOT', 'cannot move the document root');
    const previousChildren = previousParent.#children.filter(child => child !== node);
    const destinationChildren = parent === previousParent ? previousChildren : [...parent.#children];
    const at = Validation.position(position ?? destinationChildren.length, destinationChildren.length);
    destinationChildren.splice(at, 0, node);
    previousParent.#children = previousChildren;
    parent.#children = destinationChildren;
    node.#parent = parent;
    // Same instances, IDs and document ownership: the index is deliberately unchanged.
  }

  private requireIndex(): Map<string, TreeNode> {
    if (this.#index === null || this.#document !== this) {
      throw new DomainError('INVALID_ROOT', 'structure operations require a document root');
    }
    return this.#index;
  }

  private assertOwned(node: TreeNode): void {
    if (node.#document !== this) throw new DomainError('WRONG_DOCUMENT', 'node does not belong to this document');
  }

  private assertContainer(node: TreeNode): void {
    this.assertOwned(node);
    if (!node.acceptsChildren) throw new DomainError('NOT_CONTAINER', `not a container: ${node.nodeId}`);
  }

  private assertDetached(node: TreeNode): void {
    if (node.#parent !== null || node.#document !== null) {
      throw new DomainError('ALREADY_ATTACHED', 'node is already attached; remove or clone it first');
    }
    if (node.nodeId === undefined) throw new DomainError('INVALID_ROOT', 'a document cannot be inserted as a shape');
  }

  private collect(root: TreeNode): TreeNode[] {
    const nodes: TreeNode[] = [];
    const pending = [root];
    const seen = new Set<TreeNode>();
    while (pending.length > 0) {
      const node = pending.pop()!;
      if (seen.has(node)) throw new DomainError('CYCLE', 'tree contains a cycle or repeated node');
      seen.add(node);
      nodes.push(node);
      for (const child of node.#children) {
        if (child.#parent !== node) throw new DomainError('INVALID_STRUCTURE', 'parent and child links disagree');
      }
      pending.push(...node.#children);
    }
    return nodes;
  }
}
