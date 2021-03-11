export default JSONQRecord;

// =============================================================================
// CORE : JSONQRecord
// =============================================================================

function JSONQRecord(/*Any*/ val)
{
	this._value = val;
	this._type = 0;
	this._index = undefined;
	this._key = undefined;
	this._serialized = undefined;
	//型チェック
	switch (true) {
		case Number.isFinite(val) :
			this._type = 2;
			break;
		case typeof val === "string" :
			this._type = 4;
			break;
		case typeof val === "boolean" :
			this._type = 8;
			break;
		case Array.isArray(val) :
			this._type = 16;
			break;
		case val === null :
			this._type = 1;
			break;
		case typeof val === "object" : //nullも巻き込む
			this._type = 32;
			break;
		default :
			this._value = undefined;
			break;
	}
}

Object.assign(JSONQRecord.prototype,
{
	[Symbol.toStringTag] : "JSONQRecord",
	getValue             : JSONQRecord_getValue,
	getType              : JSONQRecord_getType,
	getIndex             : JSONQRecord_getIndex,
	getKey               : JSONQRecord_getKey,
	setIndex             : JSONQRecord_setIndex,
	setKey               : JSONQRecord_setKey,
	clone                : JSONQRecord_clone,
	serialize            : JSONQRecord_serialize
});

function JSONQRecord_getValue()
{
	return this._value;
}

function JSONQRecord_getType()
{
	return this._type;
}

function JSONQRecord_getIndex()
{
	return this._index;
}

function JSONQRecord_getKey()
{
	return this._key;
}

function JSONQRecord_setIndex(/*integer*/ idx)
{
	this._index = idx;
}

function JSONQRecord_setKey(/*string*/ ky)
{
	this._key = ky;
}

function JSONQRecord_clone()
{
	return Object.assign(Object.create(JSONQRecord.prototype), this, {
		_index : undefined,
		_key   : undefined
	});
}

function JSONQRecord_serialize()
{
	//省エネ 一度でもserializeしていたらそれを返す
	if (this._serialized)
		return this._serialized;
	//型情報と値の文字列化(とりあえずtype0は無視)
	let serialStr = this._type + " ";
	switch (this._type) {
	case 1 :
	case 2 :
	case 4 :
	case 8 :
		serialStr += this._value;
		break;
	case 16 :
		serialStr += "["
		+ this._value.map(e => new JSONQRecord(e)["serialize"]()).join(",")
		+ "]";
		break;
	case 32 :
		let sortedKey = Object.keys(this._value).sort();
		serialStr += "{"
		+ sortedKey.map(e => e + ":" + new JSONQRecord(this._value[e])["serialize"]()).join(",")
		+ "}";
		break;
	}
	this._serialized = serialStr;
	return serialStr;
}
