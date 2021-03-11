// =============================================================================
// JSONQ.js v3.20200206
// https://github.com/yttrium88/JSONQ
// Copyright (c) 2020 yttrium88
// Released under the MIT license
// http://opensource.org/licenses/mit-license.php
// =============================================================================
import JSONQParser from "./jsonq-parser.js";
export default JSONQ;

// =============================================================================
// I/F
// =============================================================================

function JSONQ(/*...Any*//*Any*/ ...args)
{
	//help
	if (args.length === 0)
		return "Usage: JSONQ(JSON1, [JSON2...], query)";
	const query = JSON.stringify(args.pop());
	const parser = new JSONQParser(query);
	return parser["force"](...args);
}

JSONQ["compile"] = function(/*Any*/ query)
{
	const parser = new JSONQParser(JSON.stringify(query));
	return (...args) => parser["force"](...args);
};
