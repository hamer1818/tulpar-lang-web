export type Node =
	| Program
	| VarDecl
	| Assign
	| BinaryOp
	| LogicalOp
	| UnaryOp
	| Postfix
	| Call
	| IndexExpr
	| MemberExpr
	| IntLit
	| FloatLit
	| StringLit
	| BoolLit
	| NullLit
	| Identifier
	| ArrayLit
	| ObjectLit
	| Block
	| IfStmt
	| WhileStmt
	| ForStmt
	| ForInStmt
	| FuncDecl
	| ReturnStmt
	| BreakStmt
	| ContinueStmt
	| TryStmt
	| ThrowStmt
	| ExprStmt
	| ImportStmt;

export interface NodeBase {
	line: number;
	col: number;
}

export interface Program extends NodeBase {
	kind: 'Program';
	body: Node[];
}

export interface VarDecl extends NodeBase {
	kind: 'VarDecl';
	declType: string;
	name: string;
	init: Node | null;
}

export interface Assign extends NodeBase {
	kind: 'Assign';
	target: Node;
	op: '=' | '+=' | '-=' | '*=' | '/=' | '%=';
	value: Node;
}

export interface BinaryOp extends NodeBase {
	kind: 'BinaryOp';
	op: string;
	left: Node;
	right: Node;
}

export interface LogicalOp extends NodeBase {
	kind: 'LogicalOp';
	op: '&&' | '||';
	left: Node;
	right: Node;
}

export interface UnaryOp extends NodeBase {
	kind: 'UnaryOp';
	op: '-' | '!' | '+';
	operand: Node;
}

export interface Postfix extends NodeBase {
	kind: 'Postfix';
	op: '++' | '--';
	operand: Node;
}

export interface Call extends NodeBase {
	kind: 'Call';
	callee: Node;
	args: Node[];
}

export interface IndexExpr extends NodeBase {
	kind: 'Index';
	target: Node;
	index: Node;
}

export interface MemberExpr extends NodeBase {
	kind: 'Member';
	target: Node;
	name: string;
}

export interface IntLit extends NodeBase {
	kind: 'IntLit';
	value: number;
}

export interface FloatLit extends NodeBase {
	kind: 'FloatLit';
	value: number;
}

export interface StringLit extends NodeBase {
	kind: 'StringLit';
	value: string;
}

export interface BoolLit extends NodeBase {
	kind: 'BoolLit';
	value: boolean;
}

export interface NullLit extends NodeBase {
	kind: 'NullLit';
}

export interface Identifier extends NodeBase {
	kind: 'Identifier';
	name: string;
}

export interface ArrayLit extends NodeBase {
	kind: 'ArrayLit';
	elements: Node[];
}

export interface ObjectLit extends NodeBase {
	kind: 'ObjectLit';
	pairs: { key: string; value: Node }[];
}

export interface Block extends NodeBase {
	kind: 'Block';
	body: Node[];
}

export interface IfStmt extends NodeBase {
	kind: 'If';
	cond: Node;
	then: Node;
	else_: Node | null;
}

export interface WhileStmt extends NodeBase {
	kind: 'While';
	cond: Node;
	body: Node;
}

export interface ForStmt extends NodeBase {
	kind: 'For';
	init: Node | null;
	cond: Node | null;
	update: Node | null;
	body: Node;
}

export interface ForInStmt extends NodeBase {
	kind: 'ForIn';
	varName: string;
	iter: Node;
	body: Node;
}

export interface FuncDecl extends NodeBase {
	kind: 'FuncDecl';
	name: string;
	params: { name: string; declType: string | null }[];
	body: Node;
}

export interface ReturnStmt extends NodeBase {
	kind: 'Return';
	value: Node | null;
}

export interface BreakStmt extends NodeBase {
	kind: 'Break';
}

export interface ContinueStmt extends NodeBase {
	kind: 'Continue';
}

export interface TryStmt extends NodeBase {
	kind: 'Try';
	body: Node;
	catchVar: string | null;
	catchBody: Node | null;
	finallyBody: Node | null;
}

export interface ThrowStmt extends NodeBase {
	kind: 'Throw';
	value: Node;
}

export interface ExprStmt extends NodeBase {
	kind: 'ExprStmt';
	expr: Node;
}

export interface ImportStmt extends NodeBase {
	kind: 'Import';
	path: string;
}
