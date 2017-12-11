storekeeper_api = function() {
	;
}
storekeeper_api.prototype = {

	__set_result : function(param, err_msg)
	{
		var ss_result = {};
		ss_result["error"] = err_msg;
		ss_result["result"] = param;
		pst_query_result(JSON.stringify(ss_result));
		delete ss_result;
	},

	print_info : function(info) {
		pst_log(info);
	},

	get_warehouse_information : function() {
		var wh_info = pst_warehouse_info();
		this.__set_result(wh_info, "");
	},

	create_bunch : function(bunch_name) {
		var ret_val = pst_create_bunch(bunch_name);
		if (!ret_val)
			pst_log("failed to create bunch");
		else
			pst_log("success to create bunch");
		this.__set_result(ret_val.toString(), "");
	},

	delete_bunch : function(bunch_name) {
		var ret_val = pst_delete_bunch(bunch_name);
		if (!ret_val)
			pst_log("failed to delete bunch");
		else
			pst_log("success to delete bunch");
		this.__set_result(ret_val.toString(), "");
	},

	list_bunch : function() {
		var bunch_list = pst_list_bunch();
		this.__set_result(bunch_list, "");
	},

	add_item : function(bunch_name, item) {
		var l_type = typeof(item);
		var l_ins_item = null;

		if (l_type == "object")
		{
			l_ins_item = JSON.stringify(item);	
		}
		else if (l_type == "string")
		{
			l_ins_item = item;
		}
		else
		{
			pst_query_result("error jesse");
			return null;
		}
		
		if(storekeeper_global_object['car_days'] == null)
		{
			storekeeper_global_object['car_days'] = [];
			var bunch_list = pst_list_bunch();
			for(var idx in bunch_list)
			{
				if(bunch_list[idx].substr(0,8) == 'pass_car')
					storekeeper_global_object['car_days'].push(bunch_list[idx]);
			}
			storekeeper_global_object['car_days'].sort();
		}
		var item_data = JSON.parse(l_ins_item);
		var date = item_data.send_time.substr(0, 8);
		var new_bunch = bunch_name + date;
		if(storekeeper_global_object['car_days'].indexOf(new_bunch) == -1)
		{
			var ret_val = pst_create_bunch(new_bunch);
			if (!ret_val)
				pst_log("failed to create bunch");
			else
				pst_log("success to create bunch");
			storekeeper_global_object['car_days'].push(new_bunch);
		}

		var add_keys = pst_add_item(new_bunch, l_ins_item);
		pst_log("Hash : " + add_keys);
		if(storekeeper_global_object['car_days'].length > 30)
		{
			var delete_bunch = storekeeper_global_object['car_days'].shift();

			var find_items = pst_find_item(delete_bunch, 'wh_find_item', 'function wh_find_item() { return "1"; }', "");
			for(var idx in find_items)
			{
				var find_obj = find_items[idx];
				var ret_val = pst_delete_item(delete_bunch, find_obj.hash_key);
			}
			var ret_val = pst_delete_bunch(delete_bunch);
			if (!ret_val)
				pst_log("failed to create bunch");
			else
				pst_log("success to create bunch");
		}
		
		this.__set_result(add_keys, "");
		delete l_type;
		delete l_ins_item;
		delete add_keys;
		delete date;
		delete new_bunch;
	},

	get_item : function(list)
	{
		var list_str = JSON.stringify(list);
		list_str = list_str.substr(1, list_str.length-2)
		var find_items = eval('pst_get_item('+list_str+')');
		this.__set_result(find_items, "");
	},

	del_item : function(bunch_name, hash_key) {
		// hash_key is string.
		var ret_val = pst_delete_item(bunch_name, hash_key);
		if (!ret_val)
			pst_log("failed to delete item");
		else
			pst_log("success to delete item");
		this.__set_result(ret_val.toString(), "");
	},

	edit_item : function(bunch_name, item, hash_key)
	{
		var ret_val = pst_edit_item(bunch_name, hash_key, item);
		if (!ret_val)
			pst_log("failed to edit item");
		else
			pst_log("success to edit item");
		this.__set_result(ret_val.toString(), "");
	},

	update_item : function(bunch_name, item, hash_key)
	{
		this.add_item(bunch_name, item);
		this.del_item(bunch_name, hash_key);
	},

	find_item : function(bunch_name, func_name, func_code, func_args) {
		var find_items = pst_find_item(bunch_name, func_name, func_code, func_args);
		for(idx in find_items)
		{
			var find_obj = find_items[idx];
		}
		this.__set_result(find_items, "");
	},

	find_item_for_car : function(bunch_name, func_name, func_code, func_args) {
		var ret = [];
		var find_obj = JSON.parse(func_args);

		var start_date = find_obj.PASS_DTTM.s;
		var end_date = find_obj.PASS_DTTM.e;
		var s_date = new Date(start_date.substr(0,4), start_date.substr(4,2)-1, start_date.substr(6,2), start_date.substr(8,2), start_date.substr(10,2), start_date.substr(12,2));
		var e_date = new Date(end_date.substr(0,4), end_date.substr(4,2)-1, end_date.substr(6,2), end_date.substr(8,2), end_date.substr(10,2), end_date.substr(12,2));
		var dur_date = Math.ceil((e_date - s_date) / 86400000);	// 24 * 60 * 60 * 1000 = 86400000  (1일에 해당하는 ms)

		var total_count = 0;
		delete start_date;
		delete end_date;

		var padStr = function(i) {
			return (i < 10) ? "0" + i : i;
		};

		if(find_obj["CAR_NO"].indexOf("%")>-1)
			find_obj["CAR_NO"] = find_obj["CAR_NO"].split("%");

		var cctv_arr = [];
		for(var idx in find_obj["CCTV_ID"])
			cctv_arr.push(idx);
		find_obj["CCTV_ID"] = cctv_arr;

		var bunch_list = pst_list_bunch();
		for(var i = 0; i < dur_date; i++)
		{
			var run_bunch_name = bunch_name + s_date.getFullYear() + padStr(1 + s_date.getMonth()) + padStr(s_date.getDate());
			if(bunch_list.indexOf(run_bunch_name) != -1)
			{
				var find_items = pst_find_item(run_bunch_name, func_name, func_code, JSON.stringify(find_obj));

				for( var f_idx in find_items)
				{
					var list = JSON.parse(find_items[f_idx].find_item);
					total_count = total_count + list.length;
					if(total_count > 100000)
					{
						this.__set_result("", "Max Count = (100,000), cur = ( "+total_count+" )...");
						delete find_items;
						delete list;
						return;
					}
					ret.push(find_items[f_idx]);
					delete list;
				}
				delete find_items;
			}
			s_date.setDate(s_date.getDate()+1);
		}
		if(ret.length > 0)
			this.__set_result(ret, "");
		else
			this.__set_result("", "Data Not Found. Check condition and Retry again");
		delete s_date;
		delete e_date;
		delete find_obj;
		delete ret;
	},

	load_npa : function()
	{
		if(storekeeper_global_object['dept'] != null) {
			this.__set_result(storekeeper_global_object['dept'], "");
			return;
		}
		var bunch_list = pst_list_bunch();
		if(bunch_list.indexOf("dept") == -1)
		{
			this.__set_result("", "Bunch (dept) is not created.");
			return;
		}
		var find_items = pst_find_item("dept", "get_list", func_get_list, "");
		for(var idx in find_items)
		{
			var find_obj = JSON.parse(find_items[idx].find_item);
			if(find_obj['tablename'] == "dept")
			{
				var val = find_obj['value'];
				storekeeper_global_object['dept'] = {};
				var dept = storekeeper_global_object['dept'];
				dept['list'] = {};
				for(var didx in val)
				{
					if(val[didx]["DEPT_GRD"] == "2")
					{
						if(val[didx]["USE_YN"] == "Y")
						{
							dept['list'][didx] = {};
							dept['list'][didx]["pt"] = val[didx];
							dept['list'][didx]["ps"] = {};
						}
					}
				}
				for(var didx in val)
				{
					if(val[didx]["DEPT_GRD"] == "3")
					{
						if(val[didx]["USE_YN"] == "Y")
						{
							var item = dept['list'][val[didx]["NPA_DEPT_CD"]];
							item['ps'][val[didx]["DEPT_CD"]] = {};
							item['ps'][val[didx]["DEPT_CD"]]["pt"] = val[didx];
							item['ps'][val[didx]["DEPT_CD"]]["cctv"] = {};
						}
					}
				}
			}
		}

		if(bunch_list.indexOf("cctv") == -1)
		{
			this.__set_result("", "Bunch (cctv) is not created.");
			return;
		}
		find_items = pst_find_item("cctv", "get_list", func_get_list, "");
		for(var idx in find_items)
		{
			var find_obj = JSON.parse(find_items[idx].find_item);
			if(find_obj['tablename'] == "cctv")
			{
				var val = find_obj['value'];
				var dept = storekeeper_global_object['dept'];
				for(var didx in val)
				{
					var item = val[didx];
					if(item["USE_YN"] == "Y")
					{
						try
						{
							var pa = dept['list'][item["PA_CD_112"]];
							var ps = pa['ps'][item["PS_CD_112"]];
							var cctv = ps['cctv'];
							cctv[didx] = item;							
						}
						catch(e)
						{

						}
					}
				}
			}
		}
		this.__set_result(storekeeper_global_object['dept'], "");
	},

	load_conn :function()
	{
		if(storekeeper_global_object['conn_svr'] != null) {
			this.__set_result(storekeeper_global_object['conn_svr']);
			return;
		}
		var bunch_list = pst_list_bunch();
		if(bunch_list.indexOf("conn_svr") == -1)
		{
			this.__set_result("", "Bunch (conn_svr) is not created.");
			return;
		}
		var find_items = pst_find_item("conn_svr", "get_list", func_get_list, "");
		for(var idx in find_items)
		{
			var find_obj = JSON.parse(find_items[idx].find_item);
			if(find_obj['tablename'] == "conn_svr")
			{
				var val = find_obj['value'];
				storekeeper_global_object['conn_svr'] = {};
				var conn_svr = storekeeper_global_object['conn_svr'];
				conn_svr["list"] = {};
				for(var didx in val)
				{
					conn_svr["list"][didx] = {};
					conn_svr["list"][didx]["pt"] = val[didx];
				}
			}
		}
		this.__set_result(storekeeper_global_object['conn_svr'], "");
	},

	load_cctv :function()
	{
		if(storekeeper_global_object['cctv'] != null) {
			this.__set_result(storekeeper_global_object['cctv']);
			return;
		}
		var bunch_list = pst_list_bunch();
		if(bunch_list.indexOf("cctv") == -1)
		{
			this.__set_result("", "Bunch (cctv) is not created.");
			return;
		}
		var find_items = pst_find_item("cctv", "get_list", func_get_list, "");
		for(var idx in find_items)
		{
			var find_obj = JSON.parse(find_items[idx].find_item);
			if(find_obj['tablename'] == "cctv")
			{
				var val = find_obj['value'];
				storekeeper_global_object['cctv'] = {};
				var cctv = storekeeper_global_object['cctv'];
				cctv["list"] = {};
				for(var didx in val)
				{
					cctv["list"][didx] = {};
					cctv["list"][didx]["pt"] = val[didx];
				}
			}
		}
		this.__set_result(storekeeper_global_object['cctv'], "");
	},

	get_global_object(item)
	{
		this.__set_result(storekeeper_global_object[item], "");
	},

	init_val : function()
	{
		storekeeper_global_object['car_days'] = [];
		var bunch_list = pst_list_bunch();
		for(var idx in bunch_list)
		{
			if(bunch_list[idx].substr(0,8) == 'pass_car')
			{
				storekeeper_global_object['car_days'].push(bunch_list[idx]);
			}
		}
	},

	commit : function() {
		var ret_val = pst_commit();
		if (!ret_val)
			pst_log("failed to commit");
		else
			pst_log("success to commit");
		this.__set_result(ret_val.toString(), "");
	},

	get_total_count : function()
	{
		var bunch_list = pst_list_bunch();
		var ret = {};

		for(bidx in bunch_list)
		{
			if(bunch_list[bidx].substr(0,8) == "pass_car")
			{
				var total_count = 0;
				var find_items = pst_find_item(bunch_list[bidx], "find_total_count", func_find_total_count, "");
				for(idx in find_items)
				{
					total_count = total_count + parseInt(find_items[idx].find_item);
				}
				ret[bunch_list[bidx]] = total_count;
			}
			else
			{
				var find_items = pst_find_item(bunch_list[bidx], "find_index", func_find_index, "");
				ret[bunch_list[bidx]] = find_items.length;
			}
		}
		this.__set_result(ret, "");
	}
}

function find_items(db_item, find_item)
{
	if(db_item.name == find_item)
		return JSON.stringify(db_item);
	else
		return null;
}

function find_index()
{
	return "1";
}

function wh_find_car(db_item, find_string)
{
	var find_obj = JSON.parse(find_string);
	var table = db_item.table;
	var column = table.column;
	var list = table.value;
	var cctv_list = [];
	var ret = [];
	var find_case = false;

	if(typeof(find_obj["CAR_NO"]) == "string")
		find_case = true;

	var cf_one = function(dest,ex)
	{
		if(dest.indexOf(ex) == -1)
			return false;
		return true;
	};

	var cf_two = function(dest,ex)
	{
		var pos1 = dest.indexOf(ex[0]);
		var pos2 = dest.indexOf(ex[1],pos1+1);
		if(pos1 > -1)
			if(pos2 > pos1)//12%23을 검색했을경우 123으로 인식되는걸 막아주기 위함
				return true;
		return false;
	};

	var cctv_flag = false;
	if(find_obj["CCTV_ID"] != null && find_obj["CCTV_ID"] != "")
	{
		cctv_flag = true;

		if(Object.keys(find_obj["CCTV_ID"]).length == 1)
		{
			if(find_obj["CCTV_ID"].length == 1)
				cctv_list = find_obj["CCTV_ID"];
			else
				cctv_list = Object.keys(find_obj["CCTV_ID"]);
		}
		else
			cctv_list = find_obj.CCTV_ID;
	}

	if(find_case)
	{
		if(list[0][0] <= find_obj["PASS_DTTM"].e)
		{
			if(list[list.length-1][0] >= find_obj["PASS_DTTM"].s)
			{
				for(var idx = 0; idx < list.length; idx++)
				{
					var item = list[idx];

					if(cf_one(item[1], find_obj["CAR_NO"]))
					{
						if(cctv_flag)
						{
							for(var idx2 in cctv_list)
							{
								if(item[2].indexOf(cctv_list[idx2]) == 0)
								{
									ret.push(item);
									break;
								}
							}
						}
						else
						{
							ret.push(item);
						}
					}
				}
			}
		}
	}
	else
	{
		if(list[0][0] < find_obj["PASS_DTTM"].e)
		{
			if(list[list.length-1][0] > find_obj["PASS_DTTM"].s)
			{
				for(var idx = 0; idx < list.length; idx++)
				{
					var item = list[idx];

					if(cf_two(item[1], find_obj["CAR_NO"]))
					{
						if(cctv_flag)
						{
							for(var idx2 in cctv_list)
							{
								if(item[2].indexOf(cctv_list[idx2]) == 0)
								{
									ret.push(item);
									break;
								}
							}
						}
						else
						{
							ret.push(item);
						}
					}
				}
			}
		}
	}
	if(ret.length > 0)
		return JSON.stringify(ret);
	else
		return null;
}


function find_total_count(db_item, find_string)
{
	var list = db_item.table.value;
	return list.length;
}

function get_list(db_item, find_item)
{
	return JSON.stringify(db_item);
}

function wh_find_item()
{
	return "1";
}

var pApi = new storekeeper_api();

var func_wh_find_car = wh_find_car.toString();
var func_find_total_count = find_total_count.toString();
var func_get_list = get_list.toString();
var func_find_index = find_index.toString();
var func_wh_find_item = wh_find_item.toString();
