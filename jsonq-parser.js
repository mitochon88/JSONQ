import REGraph from "../REGraph/regraph.js";
//import REGraph from "../REGraph/regraph-parser.js";
import JSONQCollection from "./jsonq-collection.js";
import JSONQOperator from "./jsonq-operator.js";
export default JSONQParser;

// =============================================================================
// CORE: JSONQParser
// =============================================================================

function JSONQParser(/*JSON*/ query)
{
	this._thunk = parser["parse"]("kuromaku", query);
}

Object.assign(JSONQParser.prototype, {
	[Symbol.toStringTag] : "JSONQParser",
	"force"              : JSONQParser_force
});

function JSONQParser_force(/*Any*/ ...root)
{
	return this._thunk(new JSONQCollection(...root))["output"]();
}

// =============================================================================
// Parser Utility
// =============================================================================

function reduceTriple(/*Any[]*/ arr, /*Function*/ callback, /*Any*/ init_)
{
	if (init_ !== undefined) {
		var curVal = init_;
		var i = -1;
	}else {
		curVal = arr[0];
		i = 0;
	}
	for (; ++i<arr.length;)
		curVal = callback(curVal, arr[i], arr[++i], i, arr);
	return curVal;
}

// =============================================================================
// Parser Graph
// =============================================================================

const parser = new REGraph();
const reg_whitespace = /(?:\s|\\[nt])+/;
const reg_open_large_bracket = /\[/;
const reg_open_medium_bracket = /\{/;
const reg_open_small_bracket = /\(/;
const reg_close_large_bracket = /\]/;
const reg_close_medium_bracket = /\}/;
const reg_close_small_bracket = /\)/;
const reg_colon = /:/;
const reg_comma = /,/;
const reg_dquote = /"/;
const reg_json_string = /"(?:[^"\\\x00-\x1F\x7F-\xA0\xAD]|\\(?:[\\/bfnrt]|u[0-9a-fA-F]{4}))*"/;

// ==================================================================== kuromaku

parser["define"]({
"name" : "kuromaku",
"node" : {
	"cms" : "commands",
	"cmd" : "command",
	"opq" : reg_dquote,
	"3op" : "ternary",
	"clq" : reg_dquote
},
"edge" : {
	[REGraph["START"]] : ["cms", "cmd", "opq"],
	"cms" : [REGraph["END"]],
	"cmd" : [REGraph["END"]],
	"opq" : ["3op"],
	"3op" : ["clq"],
	"clq" : [REGraph["END"]]
},
"action" : function(stack) {
	if (stack.length === 1)
		return stack[0];
	return stack[1];
}
});

// ==================================================================== commands

parser["define"]({
"name" : "commands",
"node" : {
	"opb" : reg_open_large_bracket,
	"cmd" : "command",
	"com" : reg_comma,
	"clb" : reg_close_large_bracket
},
"edge" : {
	[REGraph["START"]] : ["opb"],
	"opb" : ["cmd"],
	"cmd" : ["com", "clb"],
	"com" : ["cmd"],
	"clb" : [REGraph["END"]]
},
"action" : function(stack) {
	return curCollection => {
		let clx = curCollection;
		for (let i=-1; ++i,++i<stack.length;)
			clx = stack[i](clx);
		return clx;
	}
}
});

// ===================================================================== command

parser["define"]({
"name" : "command",
"node" : {
	"opb" : reg_open_medium_bracket,
	"$se" : "$set",
	"$tf" : "$transform",
	"$ag" : "$aggregate",
	"$st" : "$sort",
	"$ua" : "$unionAll",
	"$un" : "$union",
	"$is" : "$intersect",
	"$ex" : "$except",
	"$cb" : "$combine",
	"clb" : reg_close_medium_bracket
},
"edge" : {
	[REGraph["START"]] : ["opb"],
	"opb" : ["$se", "$tf", "$ag", "$st", "$ua", "$un", "$is", "$ex", "$cb"],
	"$se" : ["clb"],
	"$tf" : ["clb"],
	"$ag" : ["clb"],
	"$st" : ["clb"],
	"$ua" : ["clb"],
	"$un" : ["clb"],
	"$is" : ["clb"],
	"$ex" : ["clb"],
	"$cb" : ["clb"],
	"clb" : [REGraph["END"]]
},
"action" : function(stack) {
	return stack[1];
}
});

// ======================================================================== $set

parser["define"]({
"name" : "$set",
"node" : {
	"lab" : /"\$set"/,
	"cln" : reg_colon,
	"opq" : reg_dquote,
	"3op" : "ternary",
	"clq" : reg_dquote
},
"edge" : {
	[REGraph["START"]] : ["lab"],
	"lab" : ["cln"],
	"cln" : ["opq"],
	"opq" : ["3op"],
	"3op" : ["clq"],
	"clq" : [REGraph["END"]]
},
"action" : function(stack) {
	return stack[3];
}
});

// ================================================================== $transform

parser["define"]({
"name" : "$transform",
"node" : {
	"lab" : /"\$transform"/,
	"cln" : reg_colon,
	"opq" : reg_dquote,
	"3op" : "ternary",
	"clq" : reg_dquote
},
"edge" : {
	[REGraph["START"]] : ["lab"],
	"lab" : ["cln"],
	"cln" : ["opq"],
	"opq" : ["3op"],
	"3op" : ["clq"],
	"clq" : [REGraph["END"]]
},
"action" : function(stack) {
	return curCollection => curCollection["transform"](stack[3]);
}
});

// ================================================================== $aggregate

parser["define"]({
"name" : "$aggregate",
"node" : {
	"lab" : /"\$aggregate"/,
	"cln" : reg_colon,
	"opb" : reg_open_medium_bracket,
	"$ky" : "$aggregate-key",
	"$sm" : "$aggregate-sum",
	"$av" : "$aggregate-avg",
	"$mx" : "$aggregate-max",
	"$mn" : "$aggregate-min",
	"com" : reg_comma,
	"clb" : reg_close_medium_bracket
},
"edge" : {
	[REGraph["START"]] : ["lab"],
	"lab" : ["cln"],
	"cln" : ["opb"],
	"opb" : ["$ky", "$sm", "$av", "$mx", "$mn"],
	"$ky" : ["com", "clb"],
	"$sm" : ["com", "clb"],
	"$av" : ["com", "clb"],
	"$mx" : ["com", "clb"],
	"$mn" : ["com", "clb"],
	"com" : ["$ky", "$sm", "$av", "$mx", "$mn"],
	"clb" : [REGraph["END"]]
},
"action" : function(stack, labels) {
	//キー指定の存在チェック
	if (!labels.includes("$ky"))
		throw new Error("Aggregation key is not found!");
	//キーとそれ以外のコマンドの分離
	const cmds = stack.filter((e, i) => labels[i][0] === "$" && labels[i] !== "$ky");
	const key = stack.find((e, i) => labels[i] === "$ky");
	return curCollection => curCollection["aggregate"](key, ...cmds);
}
});

// ============================================================== $aggregate-key

parser["define"]({
"name" : "$aggregate-key",
"node" : {
	"lab" : /"\$key"/,
	"cn1" : reg_colon,
	"opb" : reg_open_medium_bracket,
	"idt" : reg_json_string,
	"cn2" : reg_colon,
	"odq" : reg_dquote,
	"3op" : "ternary",
	"cdq" : reg_dquote,
	"clb" : reg_close_medium_bracket
},
"edge" : {
	[REGraph["START"]] : ["lab"],
	"lab" : ["cn1"],
	"cn1" : ["opb"],
	"opb" : ["idt"],
	"idt" : ["cn2"],
	"cn2" : ["odq"],
	"odq" : ["3op"],
	"3op" : ["cdq"],
	"cdq" : ["clb"],
	"clb" : [REGraph["END"]]
},
"action" : function(stack) {
	return [stack[3].slice(1, -1), curCollection => stack[6](curCollection)];
}
});

// ============================================================== $aggregate-sum

parser["define"]({
"name" : "$aggregate-sum",
"node" : {
	"lab" : /"\$sum"/,
	"cn1" : reg_colon,
	"opb" : reg_open_medium_bracket,
	"idt" : reg_json_string,
	"cn2" : reg_colon,
	"odq" : reg_dquote,
	"3op" : "ternary",
	"cdq" : reg_dquote,
	"clb" : reg_close_medium_bracket
},
"edge" : {
	[REGraph["START"]] : ["lab"],
	"lab" : ["cn1"],
	"cn1" : ["opb"],
	"opb" : ["idt"],
	"idt" : ["cn2"],
	"cn2" : ["odq"],
	"odq" : ["3op"],
	"3op" : ["cdq"],
	"cdq" : ["clb"],
	"clb" : [REGraph["END"]]
},
"action" : function(stack) {
	return [stack[3].slice(1, -1), curCollection => stack[6](curCollection)["sum"]()];
}
});

// ============================================================== $aggregate-avg

parser["define"]({
"name" : "$aggregate-avg",
"node" : {
	"lab" : /"\$avg"/,
	"cn1" : reg_colon,
	"opb" : reg_open_medium_bracket,
	"idt" : reg_json_string,
	"cn2" : reg_colon,
	"odq" : reg_dquote,
	"3op" : "ternary",
	"cdq" : reg_dquote,
	"clb" : reg_close_medium_bracket
},
"edge" : {
	[REGraph["START"]] : ["lab"],
	"lab" : ["cn1"],
	"cn1" : ["opb"],
	"opb" : ["idt"],
	"idt" : ["cn2"],
	"cn2" : ["odq"],
	"odq" : ["3op"],
	"3op" : ["cdq"],
	"cdq" : ["clb"],
	"clb" : [REGraph["END"]]
},
"action" : function(stack) {
	return [stack[3].slice(1, -1), curCollection => stack[6](curCollection)["average"]()];
}
});

// ============================================================== $aggregate-max

parser["define"]({
"name" : "$aggregate-max",
"node" : {
	"lab" : /"\$max"/,
	"cn1" : reg_colon,
	"opb" : reg_open_medium_bracket,
	"idt" : reg_json_string,
	"cn2" : reg_colon,
	"odq" : reg_dquote,
	"3op" : "ternary",
	"cdq" : reg_dquote,
	"clb" : reg_close_medium_bracket
},
"edge" : {
	[REGraph["START"]] : ["lab"],
	"lab" : ["cn1"],
	"cn1" : ["opb"],
	"opb" : ["idt"],
	"idt" : ["cn2"],
	"cn2" : ["odq"],
	"odq" : ["3op"],
	"3op" : ["cdq"],
	"cdq" : ["clb"],
	"clb" : [REGraph["END"]]
},
"action" : function(stack) {
	return [stack[3].slice(1, -1), curCollection => stack[6](curCollection)["max"]()];
}
});

// ============================================================== $aggregate-min

parser["define"]({
"name" : "$aggregate-min",
"node" : {
	"lab" : /"\$min"/,
	"cn1" : reg_colon,
	"opb" : reg_open_medium_bracket,
	"idt" : reg_json_string,
	"cn2" : reg_colon,
	"odq" : reg_dquote,
	"3op" : "ternary",
	"cdq" : reg_dquote,
	"clb" : reg_close_medium_bracket
},
"edge" : {
	[REGraph["START"]] : ["lab"],
	"lab" : ["cn1"],
	"cn1" : ["opb"],
	"opb" : ["idt"],
	"idt" : ["cn2"],
	"cn2" : ["odq"],
	"odq" : ["3op"],
	"3op" : ["cdq"],
	"cdq" : ["clb"],
	"clb" : [REGraph["END"]]
},
"action" : function(stack) {
	return [stack[3].slice(1, -1), curCollection => stack[6](curCollection)["min"]()];
}
});

// ======================================================================= $sort

parser["define"]({
"name" : "$sort",
"node" : {
	"lab" : /"\$sort"/,
	"cn1" : reg_colon,
	"opb" : reg_open_medium_bracket,
	"odr" : /"\$(?:a|de)sc"/,
	"cn2" : reg_colon,
	"odq" : reg_dquote,
	"3op" : "ternary",
	"cdq" : reg_dquote,
	"clb" : reg_close_medium_bracket
},
"edge" : {
	[REGraph["START"]] : ["lab"],
	"lab" : ["cn1"],
	"cn1" : ["opb"],
	"opb" : ["odr"],
	"odr" : ["cn2"],
	"cn2" : ["odq"],
	"odq" : ["3op"],
	"3op" : ["cdq"],
	"cdq" : ["clb"],
	"clb" : [REGraph["END"]]
},
"action" : function(stack) {
	const mode = stack[3] === `"$desc"`;
	return curCollection => curCollection["sort"](stack[6], mode);
}
});

// =================================================================== $unionAll

parser["define"]({
"name" : "$unionAll",
"node" : {
	"lab" : /"\$unionAll"/,
	"cln" : reg_colon,
	"krm" : "kuromaku"
},
"edge" : {
	[REGraph["START"]] : ["lab"],
	"lab" : ["cln"],
	"cln" : ["krm"],
	"krm" : [REGraph["END"]]
},
"action" : function(stack) {
	return curCollection => curCollection["unionAll"](stack[2](curCollection));
}
});

// ====================================================================== $union

parser["define"]({
"name" : "$union",
"node" : {
	"lab" : /"\$union"/,
	"cln" : reg_colon,
	"krm" : "kuromaku"
},
"edge" : {
	[REGraph["START"]] : ["lab"],
	"lab" : ["cln"],
	"cln" : ["krm"],
	"krm" : [REGraph["END"]]
},
"action" : function(stack) {
	return curCollection => curCollection["unionAll"](stack[2](curCollection))["distinct"]();
}
});

// ================================================================== $intersect

parser["define"]({
"name" : "$intersect",
"node" : {
	"lab" : /"\$intersect"/,
	"cln" : reg_colon,
	"krm" : "kuromaku"
},
"edge" : {
	[REGraph["START"]] : ["lab"],
	"lab" : ["cln"],
	"cln" : ["krm"],
	"krm" : [REGraph["END"]]
},
"action" : function(stack) {
	return curCollection => curCollection["intersect"](stack[2](curCollection));
}
});

// ===================================================================== $except

parser["define"]({
"name" : "$except",
"node" : {
	"lab" : /"\$except"/,
	"cln" : reg_colon,
	"krm" : "kuromaku"
},
"edge" : {
	[REGraph["START"]] : ["lab"],
	"lab" : ["cln"],
	"cln" : ["krm"],
	"krm" : [REGraph["END"]]
},
"action" : function(stack) {
	return curCollection => curCollection["except"](stack[2](curCollection));
}
});

// ==================================================================== $combine

parser["define"]({
"name" : "$combine",
"node" : {
	"lab" : /"\$combine"/,
	"cln" : reg_colon,
	"opb" : reg_open_medium_bracket,
	"idt" : reg_json_string,
	"cn2" : reg_colon,
	"krm" : "kuromaku",
	"com" : reg_comma,
	"clb" : reg_close_medium_bracket
},
"edge" : {
	[REGraph["START"]] : ["lab"],
	"lab" : ["cln"],
	"cln" : ["opb"],
	"opb" : ["idt"],
	"idt" : ["cn2"],
	"cn2" : ["krm"],
	"krm" : ["com", "clb"],
	"com" : ["idt"],
	"clb" : [REGraph["END"]]
},
"action" : function(stack, label) {
	const prod = [];
	for (let i=-1; ++i<stack.length;)
		if (label[i] === "idt")
			prod.push([stack[i].slice(1, -1), stack[i + 2]]);
	return curCollection => curCollection["combine"](...prod);
}
});

// ===================================================================== ternary

parser["define"]({
"name" : "ternary",
"node" : {
	"o1" : "or",
	"_?" : /\?/,
	"t1" : "ternary",
	"_:" : reg_colon,
	"t2" : "ternary"
},
"edge" :  {
	[REGraph["START"]] : ["o1"],
	"o1" : ["_?", REGraph["END"]],
	"_?" : ["t1"],
	"t1" : ["_:"],
	"_:" : ["t2"],
	"t2" : [REGraph["END"]]
},
"action" : function(stack) {
	if (stack.length === 1)
		return stack[0];
	return curCollection => stack[0](curCollection)["operate"](JSONQOperator["ternary"], stack[2](curCollection), stack[4](curCollection));
}
});

// ========================================================================== or

parser["define"]({
"name" : "or",
"node" : {
	"an" : "and",
	"||" : /\|\|/
},
"edge" : {
	[REGraph["START"]] : ["an"],
	"an" : ["||", REGraph["END"]],
	"||" : ["an"]
},
"action" : function(stack) {
	if (stack.length === 1)
		return stack[0];
	return reduceTriple(stack, (x, y, z) => curCollection => x(curCollection)["operate"](JSONQOperator["or"], z(curCollection)));
}
});

// ========================================================================= and

parser["define"]({
"name" : "and",
"node" : {
	"eq" : "equal",
	"&&" : /&&/
},
"edge" : {
	[REGraph["START"]] : ["eq"],
	"eq" : ["&&", REGraph["END"]],
	"&&" : ["eq"]
},
"action" : function(stack) {
	if (stack.length === 1)
		return stack[0];
	return reduceTriple(stack, (x, y, z) => curCollection => x(curCollection).operate(JSONQOperator.and, z(curCollection)));
}
});

// ======================================================================= equal

parser["define"]({
"name" : "equal",
"node" : {
	"cm" : "comp",
	"==" : /[=!]=/
},
"edge" : {
	[REGraph["START"]] : ["cm"],
	"cm" : ["==", REGraph["END"]],
	"==" : ["cm"]
},
"action" : function(stack) {
	if (stack.length === 1)
		return stack[0];
	return reduceTriple(stack, (x, y, z) => {
		if (y === "==")
			return curCollection => x(curCollection).operate(JSONQOperator.equal, z(curCollection));
		return curCollection => x(curCollection).operate(JSONQOperator.noteq, z(curCollection));
	});
}
});

// ======================================================================== comp

parser["define"]({
"name" : "comp",
"node" : {
	"ss" : "sumsub",
	"<>" : /[<>]=?/
},
"edge" : {
	[REGraph["START"]] : ["ss"],
	"ss" : ["<>", REGraph["END"]],
	"<>" : ["ss"]
},
"action" : function(stack) {
	if (stack.length === 1)
		return stack[0];
	return reduceTriple(stack, (x, y, z) => {
		switch (y) {
		case "<" :
			return curCollection => x(curCollection).operate(JSONQOperator.lt, z(curCollection));
		case ">" :
			return curCollection => z(curCollection).operate(JSONQOperator.lt, x(curCollection));
		case "<=" :
			return curCollection => x(curCollection).operate(JSONQOperator.lteq, z(curCollection));
		case ">=" :
			return curCollection => z(curCollection).operate(JSONQOperator.lteq, x(curCollection));
		}
	});
}
});

// ====================================================================== sumsub

parser["define"]({
"name" : "sumsub",
"node" : {
	"md" : "muldiv",
	"+-" : /[+-]/
},
"edge" : {
	[REGraph["START"]] : ["md"],
	"md" : ["+-", REGraph["END"]],
	"+-" : ["md"]
},
"action" : function(stack) {
	if (stack.length === 1)
		return stack[0];
	return reduceTriple(stack, (x, y, z) => {
		if (y === "+")
			return curCollection => x(curCollection).operate(JSONQOperator.sum, z(curCollection));
		return curCollection => x(curCollection).operate(JSONQOperator.sub, z(curCollection));
	});
}
});

// ====================================================================== muldiv

parser["define"]({
"name" : "muldiv",
"node" : {
	"ex" : "expon",
	"*/" : /[*/%]/
},
"edge" : {
	[REGraph["START"]] : ["ex"],
	"ex" : ["*/", REGraph["END"]],
	"*/" : ["ex"]
},
"action" : function(stack) {
	if (stack.length === 1)
		return stack[0];
	return reduceTriple(stack, (x, y, z) => {
		switch (y) {
		case "*" :
			return curCollection => x(curCollection).operate(JSONQOperator.mul, z(curCollection));
		case "/" :
			return curCollection => x(curCollection).operate(JSONQOperator.div, z(curCollection));
		case "%" :
			return curCollection => x(curCollection).operate(JSONQOperator.mod, z(curCollection));
		}
	});
}
});

// ======================================================================= expon

parser["define"]({
"name" : "expon",
"node" : {
	"un" : "unary",
	"**" : /\*\*/,
	"ex" : "expon"
},
"edge" : {
	[REGraph["START"]] : ["un"],
	"un" : ["**", REGraph["END"]],
	"**" : ["ex"],
	"ex" : [REGraph["END"]]
},
"action" : function(stack) {
	if (stack.length === 1)
		return stack[0];
	return curCollection => stack[0](curCollection).operate(JSONQOperator.exp, stack[2](curCollection));
}
});

// ======================================================================= unary

parser["define"]({
"name" : "unary",
"node" : {
	[REGraph["IGNORE"]] : reg_whitespace,
	"ac" : "access",
	"-!" : /[-+!]/,
	"un" : "unary",
},
"edge" : {
	[REGraph["START"]] : ["ac", "-!"],
	"ac" : [REGraph["END"]],
	"-!" : ["un"],
	"un" : [REGraph["END"]]
},
"action" : function(stack) {
	switch (stack[0]) {
		case "-" :
			return curCollection => stack[1](curCollection).operate(JSONQOperator.minus);
		case "!" :
			return curCollection => stack[1](curCollection).operate(JSONQOperator.not);
		case "+" :
			return curCollection => stack[1](curCollection).operate(JSONQOperator.plus);
		default :
			return stack[0];
	}
}});

// ============================================================= access / filter

parser["define"]({
"name" : "access",
"node" : {
	[REGraph["IGNORE"]] : reg_whitespace,
	"pr" : "primal",
	"._" : /\./,
	".." : /\.\./,
	"*_" : /\*/,
	"ob" : reg_open_small_bracket,
	"3o" : "ternary",
	"cb" : reg_close_small_bracket
},
"edge" : {
	[REGraph["START"]] : ["pr", "..", "._"],
	"pr" : ["..", "._", "ob", REGraph["END"]],
	"._" : ["*_", "pr"],
	".." : ["*_", "pr"],
	"*_" : ["..", "._", "ob", REGraph["END"]],
	"ob" : ["3o"],
	"3o" : ["cb"],
	"cb" : ["..", "._", REGraph["END"]]
},
"action" : function(stack, label) {
	if (stack.length === 1)
		return stack[0];
	if (label[0] !== "pr")
		//@の補完
		stack.unshift(curCollection => curCollection);
	return reduceTriple(stack, (x, y, z, i) => {
		switch (y + typeof z) {
		case ".function" :
			return curCollection => x(curCollection).operate(JSONQOperator.access, z(curCollection));
		case ".string" :
			return curCollection => x(curCollection).operate(JSONQOperator.accessAll);
		case "..function" :
			return curCollection => x(curCollection).operate(JSONQOperator.descendant).operate(JSONQOperator.access, z(curCollection));
		case "..string" :
			return curCollection => x(curCollection).operate(JSONQOperator.descendant).operate(JSONQOperator.accessAll);
		case "(function" :
			//filter演算 右端の)飛ばし
			stack.splice(i + 1, 1);
			return curCollection => x(curCollection).filter(z);
		}
	});
}
});

// ====================================================================== primal

parser["define"]({
"name" : "primal",
"node" : {
	"num" : "number",
	"str" : "string",
	"clx" : /@/,
	"roo" : /\$/,
	"idx" : /#/,
	"key" : /\*/,
	"opb" : reg_open_small_bracket,
	"grp" : "ternary",
	"clb" : reg_close_small_bracket,
	"arr" : "array",
	"hsh" : "hash"
},
"edge" : {
	[REGraph["START"]] : ["num", "str", "clx", "roo", "idx", "key", "opb", "arr", "hsh"],
	"num" : [REGraph["END"]],
	"str" : [REGraph["END"]],
	"clx" : [REGraph["END"]],
	"roo" : [REGraph["END"]],
	"idx" : [REGraph["END"]],
	"key" : [REGraph["END"]],
	"opb" : ["grp"],
	"grp" : ["clb"],
	"clb" : [REGraph["END"]],
	"arr" : [REGraph["END"]],
	"hsh" : [REGraph["END"]]
},
"action" : function(stack, label) {
	switch (label[0]) {
		case "num" :
		case "str" :
			return curCollection => curCollection["extend"](stack[0]);
		case "clx" :
			return curCollection => curCollection;
		case "roo" :
			return curCollection => curCollection.reset();
		case "idx" :
			return curCollection => curCollection.operate(JSONQOperator.index);
		case "key" :
			return curCollection => curCollection.operate(JSONQOperator.key);
		case "opb" :
			return curCollection => stack[1](curCollection);
		case "arr" :
		case "hsh" :
			return curCollection => stack[0](curCollection);
	}
}
});

// ====================================================================== number

parser["define"]({
"name" : "number",
"node" : {
	"in" : /(?:0|[1-9]\d*)/, //符号は単項演算子で扱う
	"fl" : /\.\d+/,
	"ex" : /[Ee][+-]?\d+/
},
"edge" : {
	[REGraph["START"]] : ["in"],
	"in" : ["fl", "ex", REGraph["END"]],
	"fl" : ["ex", REGraph["END"]],
	"ex" : [REGraph["END"]]
},
"action" : function(stack) {
	return +stack.join("");
}
});

// ====================================================================== string

parser["define"]({
"name" : "string",
"node" : {
	"lm" : /[_a-zA-Z][_a-zA-Z0-9]*/, //生で使える文字列
	"pi" : /\|/,
	"ct" : /(?:\|\||\\(?:[\\/bfnrt]|u[0-9a-fA-F]{4}))+/, //||と制御文字
	"mj" : /[^|\\\x00-\x1F\x7F-\xA0\xAD]+/, //|\と非制御文字
	"pe" : /\|/
},
"edge" : {
	[REGraph["START"]] : ["lm", "pi"],
	"lm" : [REGraph["END"]],
	"pi" : ["ct", "mj", "pe"],
	"ct" : ["mj", "pe"],
	"mj" : ["ct", "pe"],
	"pe" : [REGraph["END"]]
},
"action" : function(stack, label) {
	if (label[0] === "lm") {
		//特殊な値を逃がす
		if (["true", "false", "null"].includes(stack[0]))
			return eval(stack[0]);
		return stack[0];
	}
	return JSON.parse('"' + stack.join("") + '"').slice(1, -1).replace(/\|\|/g, "|");
}
});

// ======================================================================= array

parser["define"]({
"name" : "array",
"node" : {
	"opb" : reg_open_large_bracket,
	"3op" : "ternary",
	"com" : reg_comma,
	"clb" : reg_close_large_bracket
},
"edge" : {
	[REGraph["START"]] : ["opb"],
	"opb" : ["3op", "clb"],
	"3op" : ["com", "clb"],
	"com" : ["3op"],
	"clb" : [REGraph["END"]]
},
"action" : function(stack) {
	if (stack.length === 2)
		//配列が空
		return curCollection => curCollection.arrayMapper();
	//空ではない
	return curCollection => curCollection.arrayMapper(...stack.filter((e, i) => i % 2 === 1).map(e => e(curCollection)));
}
});

// ======================================================================== hash

parser["define"]({
"name" : "hash",
"node" : {
	"opb" : reg_open_medium_bracket,
	"key" : "ternary",
	"cln" : reg_colon,
	"val" : "ternary",
	"com" : reg_comma,
	"clb" : reg_close_medium_bracket
},
"edge" : {
	[REGraph["START"]] : ["opb"],
	"opb" : ["key", "clb"],
	"key" : ["cln"],
	"cln" : ["val"],
	"val" : ["com", "clb"],
	"com" : ["key"],
	"clb" : [REGraph["END"]]
},
"action" : function(stack) {
	if (stack.length === 2)
		//オブジェクトが空
		return curCollection => curCollection.hashMapper();
	//空ではない
	return curCollection => curCollection.hashMapper(...stack.filter((e, i) => i % 2 === 1).map(e => e(curCollection)));
}
});
