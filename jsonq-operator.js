import JSONQRecord from "./jsonq-record.js";
export default JSONQOperator;

// =============================================================================
// CORE : JSONQOperator
// =============================================================================

function JSONQOperator() {}

Object.assign(JSONQOperator, {
	index      : JSONQOperator_index,
	key        : JSONQOperator_key,
	descendant : JSONQOperator_descendant,
	accessAll  : JSONQOperator_accessAll,
	access     : JSONQOperator_access,
	plus       : JSONQOperator_plus,
	minus      : JSONQOperator_minus,
	not        : JSONQOperator_not,
	exp        : JSONQOperator_exp,
	mul        : JSONQOperator_mul,
	div        : JSONQOperator_div,
	mod        : JSONQOperator_mod,
	sum        : JSONQOperator_sum,
	sub        : JSONQOperator_sub,
	lt         : JSONQOperator_lt,
	lteq       : JSONQOperator_lteq,
	equal      : JSONQOperator_equal,
	noteq      : JSONQOperator_noteq,
	and        : JSONQOperator_and,
	or         : JSONQOperator_or,
	ternary    : JSONQOperator_ternary
});

function* JSONQOperator_index(/*JSONQRecord*/ x)
{
	yield new JSONQRecord(x.getIndex());
}

function* JSONQOperator_key(/*JSONQRecord*/ x)
{
	yield new JSONQRecord(x.getKey());
}

function* JSONQOperator_descendant(/*JSONQRecord*/ x)
{
	switch (x.getType()) {
	case 16 :
	case 32 :
		//オブジェクト自分自身をadd
		yield x.clone();
		//子でオブジェクト型のものだけ再帰
		for (let cld of JSONQOperator.accessAll(x)) {
			switch (cld.getType()) {
			case 16 :
			case 32 :
				yield* JSONQOperator.descendant(cld);
				break;
			}
		}
		break;
	}
}

function* JSONQOperator_accessAll(/*JSONQRecord*/ x)
{
	switch (x.getType()) {
	case 16 :
	case 32 :
		//列挙可能なすべてのプロパティアクセス
		for (let y of Object.keys(x.getValue()))
			yield* JSONQOperator.access(x, new JSONQRecord(y));
		break;
	}
}

function* JSONQOperator_access(/*JSONQRecord*/ x, /*JSONQRecord*/ y)
{
	switch (x.getType() * 128 + y.getType()) {
	case 258 :
		//ランダム値生成 [x, y)
		yield new JSONQRecord(Math.random() * (y.getValue() - x.getValue()) + x.getValue());
		break;
	case 2050 :
	case 2056 :
	case 4098 :
	case 4104 :
		//x[y.toString()]
	case 2052 :
	case 4100 :
		//プロパティへのアクセス
		let val = x.getValue()[y.getValue()];
		if (val !== undefined) {
			let z = new JSONQRecord(val);
			z.setKey(y.getValue());
			yield z;
		}
		break;
	case 4128 :
		//a.{b : c, d : e ...} フィルタのショートハンド a(.b == c && .d == e && ...) と等価
		const obj = x["getValue"]();
		for (let cond of Object.entries(y["getValue"]()))
			if (!obj.hasOwnProperty(cond[0]) || obj[cond[0]] !== cond[1])
				return;
		yield x["clone"]();
		break;
	}
}

function* JSONQOperator_plus(/*JSONQRecord*/ x)
{
	switch (x.getType()) {
	case 1 :
	case 8 :
		//1bit化
		yield new JSONQRecord(+x.getValue());
		break;
	case 2 :
		//整数部分を取得
		yield new JSONQRecord(Math.trunc(x.getValue()));
		break;
	case 4 :
	case 16 :
		//文字数or要素数を取得
		yield new JSONQRecord(x.getValue().length);
		break;
	case 32 :
		//オブジェクトのサイズを取得
		yield new JSONQRecord(Object.values(x.getValue()).length);
		break;
	}
}

function* JSONQOperator_minus(/*JSONQRecord*/ x)
{
	switch (x.getType()) {
	case 1 :
	case 8 :
		//1bit化・符号反転
	case 2 :
		//符号反転
		yield new JSONQRecord(-x.getValue());
		break;
	case 4 :
		//文字列を反転
		yield new JSONQRecord(x.getValue().split("").reverse().join(""));
		break;
	case 16 :
		//配列を逆転
		yield new JSONQRecord(x.getValue().reverse());
		break;
	}
}

function* JSONQOperator_not(/*JSONQRecord*/ x)
{
	switch (x.getType()) {
	case 1 :
		// !null=0
	case 2 :
		//ゼロ判定
	case 4 :
		//空文字判定
	case 8 :
		//真偽反転
		yield new JSONQRecord(!x.getValue());
		break;
	case 16 :
		//配列の長さが0かどうか判定
		yield new JSONQRecord(x.getValue().length === 0)
		break;
	case 32 :
		//オブジェクトのサイズが0かどうか判定
		yield new JSONQRecord(Object.values(x.getValue()).length === 0)
		break;
	}
}

function* JSONQOperator_exp(/*JSONQRecord*/ x, /*JSONQRecord*/ y)
{
	switch (x.getType() * 128 + y.getType()) {
	case 129 :
		//null**null=1
	case 1032 :
		//bool**bool x===false&&y===true?0:1
	case 258 :
		//算術べき乗
		yield new JSONQRecord(x.getValue() ** y.getValue());
		break;
	}
}

function* JSONQOperator_mul(/*JSONQRecord*/ x, /*JSONQRecord*/ y)
{
	switch (x.getType() * 128 + y.getType()) {
	case 258 :
		//算術乗算
		yield new JSONQRecord(x.getValue() * y.getValue());
		break;
	case 514 : {
		//文字列の繰り返し(str*num)
		const cnt = y.getValue();
		if (cnt < 0)
			cnt = 0;
		yield new JSONQRecord(x.getValue().repeat(cnt))
		break;
	}
	case 260 : {
		//文字列の繰り返し(num*str)
		const cnt = x.getValue();
		if (cnt < 0)
			cnt = 0;
		yield new JSONQRecord(y.getValue().repeat(cnt))
		break;
	}
	}
}

function* JSONQOperator_div(/*JSONQRecord*/ x, /*JSONQRecord*/ y)
{
	switch (x.getType() * 128 + y.getType()) {
	case 258 :
		//算術除算
		const dividend = y.getValue();
		if (dividend === 0)
			break;
		yield new JSONQRecord(x.getValue() / dividend);
		break;
	case 516:
		//文字列を文字列で配列分割
		yield new JSONQRecord(x.getValue().split(y.getValue()));
		break;
	}
}

function* JSONQOperator_mod(/*JSONQRecord*/ x, /*JSONQRecord*/ y)
{
	switch (x.getType() * 128 + y.getType()) {
	case 258 :
		//算術剰余(JS仕様:符号は被除数依存)
		const dividend = y.getValue();
		if (dividend === 0)
			break;
		yield new JSONQRecord(x.getValue() % dividend);
		break;
	}
}

function* JSONQOperator_sum(/*JSONQRecord*/ x, /*JSONQRecord*/ y)
{
	switch (x.getType() * 128 + y.getType()) {
	//算術加算
	case 258 :
	//文字列の連結
	case 260 :
	case 514 :
	case 516 :
		yield new JSONQRecord(x.getValue() + y.getValue());
		break;
	case 144 :
	case 272 :
	case 528 :
	case 1040 :
	case 2049 :
	case 2050 :
	case 2052 :
	case 2056 :
	case 2064 :
	case 2080 :
		//配列に連結
		yield new JSONQRecord(Array.prototype.concat(x.getValue(), y.getValue()));
		break;
	case 4100:
		//プロパティの存在
		const key = y.getValue();
		const val = x.getValue();
		yield new JSONQRecord(val.hasOwnProperty(key) && val[key] !== undefined);
		break;
	case 4112 :
	case 4128 :
		//オブジェクトのマージ(右オペランド優先)
		yield new JSONQRecord(Object.assign({}, x.getValue(), y.getValue()));
		break;
	case 130 :
	case 132 :
		//nullを空文字扱いで連結, 0扱いで加算
		yield y["clone"]();
		break;
	case 257 :
	case 513 :
		//nullを空文字扱いで連結, 0扱いで加算
		yield x["clone"]();
		break;
	}
}

function* JSONQOperator_sub(/*JSONQRecord*/ x, /*JSONQRecord*/ y)
{
	switch (x.getType() * 128 + y.getType()) {
	case 258 :
		//算術減算
		yield new JSONQRecord(x.getValue() - y.getValue());
		break;
	}
}

function* JSONQOperator_lt(/*JSONQRecord*/ x, /*JSONQRecord*/ y)
{
	switch (x.getType() * 128 + y.getType()) {
	case 129 :
		//null<null
	case 258 :
	case 516 :
		//数値の大小比較・文字列のコードポイントでの比較
		yield new JSONQRecord(x.getValue() < y.getValue());
		break;
	case 2064 :
	case 4128 :
		//オブジェクト同士の比較
		yield new JSONQRecord(x.serialize() < y.serialize());
		break;
	case 144 :
	case 160 :
	case 272 :
	case 288 :
	case 528 :
	case 544 :
	case 1040 :
	case 1056 :
		//配列・オブジェクト中の値の存在確認（プリミティブ値のみ）
		yield new JSONQRecord(Object.values(y.getValue()).includes(x.getValue()));
		break;
	}
}

function* JSONQOperator_lteq(/*JSONQRecord*/ x, /*JSONQRecord*/ y)
{
	switch (x.getType() * 128 + y.getType()) {
	case 258 :
	case 516 :
		//数値の大小比較・文字列のコードポイントでの比較
		yield new JSONQRecord(x.getValue() <= y.getValue());
		break;
	case 2064 :
	case 4128 :
		//オブジェクト同士の比較
		yield new JSONQRecord(x.serialize() <= y.serialize());
		break;
	}
}

function* JSONQOperator_equal(/*JSONQRecord*/ x, /*JSONQRecord*/ y)
{
	switch (x.getType() * 128 + y.getType()) {
	case 129 :
	case 258 :
	case 516 :
	case 1032 :
		//同じ型同士：厳密な一致
		yield new JSONQRecord(x.getValue() === y.getValue());
		break;
	case 2064 :
	case 4128 :
		//オブジェクト同士の一致
		yield new JSONQRecord(x.serialize() === y.serialize());
		break;
	case 130 :
	case 132 :
	case 136 :
	case 144 :
	case 160 :
	case 257 :
	case 260 :
	case 264 :
	case 272 :
	case 288 :
	case 513 :
	case 514 :
	case 520 :
	case 528 :
	case 544 :
	case 1025 :
	case 1026 :
	case 1028 :
	case 1040 :
	case 1056 :
	case 2049 :
	case 2050 :
	case 2052 :
	case 2056 :
	case 2080 :
	case 4097 :
	case 4098 :
	case 4100 :
	case 4104 :
	case 4112 :
		//違う型
		yield new JSONQRecord(false);
		break;
	}
}

function* JSONQOperator_noteq(/*JSONQRecord*/ x, /*JSONQRecord*/ y)
{
	switch (x.getType() * 128 + y.getType()) {
	case 129 :
	case 258 :
	case 516 :
	case 1032 :
		//同じ型同士：厳密な不一致
		yield new JSONQRecord(x.getValue() !== y.getValue());
		break;
	case 2064 :
	case 4128 :
		//オブジェクト同士の不一致
		yield new JSONQRecord(x.serialize() !== y.serialize());
		break;
	case 130 :
	case 132 :
	case 136 :
	case 144 :
	case 160 :
	case 257 :
	case 260 :
	case 264 :
	case 272 :
	case 288 :
	case 513 :
	case 514 :
	case 520 :
	case 528 :
	case 544 :
	case 1025 :
	case 1026 :
	case 1028 :
	case 1040 :
	case 1056 :
	case 2049 :
	case 2050 :
	case 2052 :
	case 2056 :
	case 2080 :
	case 4097 :
	case 4098 :
	case 4100 :
	case 4104 :
	case 4112 :
		//違う型
		yield new JSONQRecord(true);
		break;
	}
}

function* JSONQOperator_and(/*JSONQRecord*/ x, /*JSONQRecord*/ y)
{
	switch (x.getType() * 128 + y.getType()) {
	case 1032 :
		//論理AND(両辺)
		yield new JSONQRecord(x["getValue"]() && y["getValue"]());
		break;
	case 1024 :
	case 1025 :
	case 1026 :
	case 1028 :
	case 1040 :
	case 1056 :
		//論理AND(左辺)
		if (!x["getValue"]()) {
			yield new JSONQRecord(false);
			break;
	  }
	case 8 :
	case 136 :
	case 264 :
	case 520 :
	case 2056 :
	case 4104 :
		//論理AND(右辺)
		if (!y["getValue"]()) {
			yield new JSONQRecord(false);
			break;
	  }
	}
}

function* JSONQOperator_or(/*JSONQRecord*/ x, /*JSONQRecord*/ y)
{
	switch (x.getType() * 128 + y.getType()) {
	case 1032 :
		//論理OR(両辺)
		yield new JSONQRecord(x["getValue"]() || y["getValue"]());
		break;
	case 1024 :
	case 1025 :
	case 1026 :
	case 1028 :
	case 1040 :
	case 1056 :
		//論理OR(左辺)
		if (x["getValue"]()) {
			yield new JSONQRecord(true);
			break;
	  }
	case 8 :
	case 136 :
	case 264 :
	case 520 :
	case 2056 :
	case 4104 :
		//論理OR(右辺)
		if (y["getValue"]()) {
			yield new JSONQRecord(true);
			break;
	  }
	}
}

function* JSONQOperator_ternary(/*JSONQRecord*/ x, /*JSONQRecord*/ y, /*JSONQRecord*/ z)
{
	switch (x["getType"]()) {
	case 1 :
	case 8 :
		//条件演算
		if (x["getValue"]())
			yield y["clone"]();
		else
			yield z["clone"]();
		break;
	case 16 :
	case 32 :
		//メソッドコール(実験的機能)
		if (y["getType"]() === 4 && z["getType"]() === 16)
			yield new JSONQRecord(x["getValue"]()[y["getValue"]()](...z["getValue"]()));
		break;
	}
}
