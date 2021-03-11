import JSONQOperator from "./jsonq-operator.js";
import JSONQRecord from "./jsonq-record.js";
export default JSONQCollection;

// =============================================================================
// CORE : JSONQCollection
// =============================================================================

function JSONQCollection(/*Any[]*/ ...elem)
{
	this._records = [];
	for (let e of elem)
		this["push"](new JSONQRecord(e));
	this._initial = this._records;
}

JSONQCollection["EMPTY_FILLING"] = new JSONQRecord();

Object.assign(JSONQCollection.prototype,
{
	[Symbol.toStringTag] : "JSONQCollection",
	[Symbol.iterator]    : JSONQCollection_iterator,
	output               : JSONQCollection_output,
	push                 : JSONQCollection_push,
	put                  : JSONQCollection_put,
	count                : JSONQCollection_count,
	operate              : JSONQCollection_operate,
	reset                : JSONQCollection_reset,
	extend               : JSONQCollection_extend,
	arrayMapper          : JSONQCollection_arrayMapper,
	hashMapper           : JSONQCollection_hashMapper,
	collectionMapper     : JSONQCollection_collectionMapper,
	exam                 : JSONQCollection_exam,
	filter               : JSONQCollection_filter,
	transform            : JSONQCollection_transform,
	aggregate            : JSONQCollection_aggregate,
	sum                  : JSONQCollection_sum,
	average              : JSONQCollection_average,
	max                  : JSONQCollection_max,
	min                  : JSONQCollection_min,
	sort                 : JSONQCollection_sort,
	unionAll             : JSONQCollection_unionAll,
	distinct             : JSONQCollection_distinct,
	intersect            : JSONQCollection_intersect,
	except               : JSONQCollection_except,
	combine              : JSONQCollection_combine
});

function JSONQCollection_iterator()
{
	return this._records[Symbol.iterator]();
}

function JSONQCollection_output(/*boolean*/ rollup_ = false)
{
	if (this["count"]() === 0)
		return [];
	if (rollup_ === true && this["count"]() === 1)
		return this._records[0]["getValue"]();
	return this._records.map(e => e["getValue"]());
}

function JSONQCollection_push(/*JSONQRecord[]*/ ...recs)
//インデックスの書き込みをともなうレコードの追加
{
	for (let rec of recs) {
		//インデックスの書き込み
		rec["setIndex"](this["count"]());
		this["put"](rec);
	}
	return this;
}

function JSONQCollection_put(/*JSONQRecord[]*/ ...recs)
//インデックスの書き込みをしないレコードの追加
{
	for (let rec of recs) {
		//Recordの値の検査(ゼロ除算とかでNaNが出た時用)
		if (rec["getType"]() !== 0)
			this._records.push(rec);
	}
	return this;
}

function JSONQCollection_count()
//レコード数を取得
{
	return this._records.length;
}

function JSONQCollection_operate(/*GeneratorFunction*/ operator, /*JSONQCollection[]*/ ...operands_)
//コレクション間でオペレータを使って演算を実行
{
	//Recordの直積を作る
	const operandArr = [this, ...operands_].reduce((a, b) => {
		const newArr = [];
		for (let i of a) {
			if (b._records.length === 0) //空集合があると直積が空集合になっちゃうので仮のRecordを挿入 OperatorにはRecordが流れてくることを保証
				newArr.push(i.concat(JSONQCollection["EMPTY_FILLING"]));
			else
				for (let j of b)
					newArr.push(i.concat(j));
		}
		return newArr;
	}, [[]]);
	//直積1件ごとにオペレータ実行
	const newCollection = this["extend"]();
	for (let opd of operandArr) {
		for (let rec of operator(...opd))
			newCollection["push"](rec);
	}
	return newCollection;
}

function JSONQCollection_reset()
{
	return Object.assign(Object.create(JSONQCollection.prototype), this, {
		_records : this._initial
	});
}

function JSONQCollection_extend(/*Any[]*/ ...values)
//イニシャルレコードを引き継いだ、引数を新たなレコードとするコレクションを生成
{
	const newCollection = new JSONQCollection(...values);
	newCollection._initial = this._initial;
	return newCollection;
}

function JSONQCollection_arrayMapper(/*JSONQCollection[]*/ ...clxs)
{
	const arr = [];
	for (let clx of clxs) {
		//コレクションを展開
		for (let rec of clx)
			arr.push(rec["getValue"]());
	}
	return this["extend"](arr);
}

function JSONQCollection_hashMapper(/*JSONQCollection[]*/ ...clxs)
{
	const hash = {};
	clxs.forEach((clx, idx) => {
		//キー（偶数インデックス）であり単一のレコードを持つコレクション
		if (idx % 2 === 0 && clx["count"]() === 1)
			//キーの型が文字列か数値か真偽値
			if (clx._records[0]["getType"]() === 4 || clx._records[0]["getType"]() === 2 || clx._records[0]["getType"]() === 8)
				//値が空でない
				if (clxs[idx+1]["count"]() !== 0)
					hash[clx["output"](true)] = clxs[idx+1]["output"](true);
	});
	return this["extend"](hash);
}

function JSONQCollection_collectionMapper(/*JSONQCollection[]*/ ...clxs)
{
	const newCollection = this["extend"]();
	for (clx of clxs)
		newCollection["unionAll"](clx);
	return newCollection;
}

function JSONQCollection_exam(/*Function*/ examFn, /*Function*/ callback)
//レコード1件ごとに評価関数を実行し、(結果コレクション, 元レコード)のコールバックを実行
{
	//レコードを単件ずつコレクション化
	for (let recFragment of this) {
		let clxFragment = this["extend"]()["put"](recFragment);
		//コールバック(clx:examFn実行結果, rec:元レコード)
		callback(examFn(clxFragment), recFragment);
	}
}

function JSONQCollection_filter(/*Function*/ flExam)
{
	const newCollection = this["extend"]();
	this["exam"](flExam, function(c, r) {
		if (c["output"](true) === true)
			newCollection["push"](r["clone"]()); //1回filterかけるとインデックスは更新される・アクセスキーはなくなる
	});
	return newCollection;
}

function JSONQCollection_transform(/*Function*/ tfExam)
{
	const newCollection = this["extend"]();
	this["exam"](tfExam, function(c) {
		newCollection["push"](new JSONQRecord(c["output"](true)));
	});
	return newCollection;
}

function JSONQCollection_aggregate(/*[string,Function]*/ exKey, /*[string,Function]*/ ...exCmd)
{
	//集計キー作成
	const allocated = {}; //{serial: [...record]}
	this["exam"](exKey[1], function(c, r) {
		for (let rec of c) {
			let key = rec["serialize"]();
			if (allocated.hasOwnProperty(key))
				allocated[key].push(r);
			else
				allocated[key] = [r];
		}
	});
	//振り分けレコードの作成
	const newCollection = this["extend"]();
	for (let allocRecords of Object.values(allocated)) {
		let allocClx = this["extend"]()["put"](...allocRecords);
		let aggr = {[exKey[0]] : allocClx["output"]()};
		for (let cmd of exCmd)
			aggr[cmd[0]] = cmd[1](allocClx)["output"](true);
		newCollection["push"](new JSONQRecord(aggr));
	}
	return newCollection;
}

function JSONQCollection_sum()
{
	const newCollection = this["extend"]();
	//レコード数1の場合、reduceを素通りしてしまうのでcloneする
	if (this._records.length === 1)
		return newCollection["push"](this._records[0]["clone"]());
	const recSum = this._records.reduce((x, y) => JSONQOperator["sum"](x, y).next().value);
	return newCollection["push"](recSum);
}

function JSONQCollection_average()
{
	const newCollection = this["extend"]();
	//レコード数1の場合、reduceを素通りしてしまうのでcloneする
	if (this._records.length === 1)
		return newCollection["push"](this._records[0]["clone"]());
	const recSum = this._records.reduce((x, y) => JSONQOperator["sum"](x, y).next().value);
	return newCollection["push"](JSONQOperator["div"](recSum, new JSONQRecord(this["count"]())).next().value);
}

function JSONQCollection_max()
{
	const newCollection = this["extend"]();
	//レコード数1の場合、reduceを素通りしてしまうのでcloneする
	if (this._records.length === 1)
		return newCollection["push"](this._records[0]["clone"]());
	const recMax = this._records.reduce((x, y) => JSONQOperator["ternary"](JSONQOperator["lteq"](y, x).next().value, x, y).next().value);
	return newCollection["push"](recMax);
}

function JSONQCollection_min()
{
	const newCollection = this["extend"]();
	//レコード数1の場合、reduceを素通りしてしまうのでcloneする
	if (this._records.length === 1)
		return newCollection["push"](this._records[0]["clone"]());
	const recMin = this._records.reduce((x, y) => JSONQOperator["ternary"](JSONQOperator["lteq"](x, y).next().value, x, y).next().value);
	return newCollection["push"](recMin);
}

function JSONQCollection_sort(/*Function*/ cpExam, /*boolean*/ isDesc)
{
	//ソート対象列作成
	const sortee = [];
	this["exam"](cpExam, function(clxFragment, recFragment) {
		sortee.push([
			new JSONQRecord(clxFragment["output"](true)),
			recFragment
		]);
	});
	//ソート実行
	const comp = isDesc ? -1 : 1;
	sortee.sort(function(a, b) {
		switch (true) {
		//①型の比較
		case a[0]["getType"]() < b[0]["getType"]() :
			return -1 * comp;
		case a[0]["getType"]() > b[0]["getType"]() :
			return 1 * comp;
		//②値の比較
		case JSONQOperator["lt"](a[0], b[0]).next().value["getValue"]() :
			return -1 * comp;
		case JSONQOperator["lt"](b[0], a[0]).next().value["getValue"]() :
			return 1 * comp;
		default:
			return 0;
		}
	});
	//ソート済みコレクション作成
	const newCollection = this["extend"]();
	for (let e of sortee)
		newCollection["push"](e[1]["clone"]());
	return newCollection;
}

function JSONQCollection_unionAll(/*JSONQCollection*/ clx2)
{
	const newCollection = this["extend"]();
	for (let rec of [...this, ...clx2])
		newCollection["push"](rec["clone"]());
	return newCollection;
}

function JSONQCollection_distinct()
{
	const aggrKey = "$$DIST";
	return this["aggregate"]([aggrKey, clx => clx]
		)["operate"](JSONQOperator["access"], new JSONQCollection(aggrKey)
		)["operate"](JSONQOperator["access"], new JSONQCollection(0));
}

function JSONQCollection_intersect(/*JSONQCollection*/ clx2)
{
	const newCollection = this["extend"]();
	const dist1 = this["distinct"]();
	const dist2 = clx2["distinct"]();
	for (let rec1 of dist1) {
		const serial1 = rec1["serialize"]();
		for (let rec2 of dist2) {
			if (serial1 === rec2["serialize"]()) {
				newCollection["push"](rec1["clone"]());
				break;
			}
		}
	}
	return newCollection;
}

function JSONQCollection_except(/*JSONQCollection*/ clx2)
{
	const newCollection = this["extend"]();
	const dist1 = this["distinct"]();
	const dist2 = clx2["distinct"]();
	loop1:for (let rec1 of dist1) {
		const serial1 = rec1["serialize"]();
		for (let rec2 of dist2)
			if (serial1 === rec2["serialize"]())
				continue loop1;
		newCollection["push"](rec1["clone"]());
	}
	return newCollection;
}

function JSONQCollection_combine(/*(JSONString,Function)[]*/ ...seed)
{
	//ハッシュ化
	const base = [];
	for (let vec of seed)
		base.push(vec[1](this)["transform"](clx => clx["hashMapper"](new JSONQCollection(vec[0]), clx)));
	//直積化
	return base.reduce((a, b) => a["operate"](JSONQOperator["sum"], b));
}
