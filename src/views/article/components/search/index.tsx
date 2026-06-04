/* eslint-disable prettier/prettier */
import React, { FC } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircleOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Input, Select, Tooltip } from "antd";

import { ContentInterWrap } from "@/components/common-wrap";

import "./index.scss";

type SelectOption = { label: string; value: number | string };

interface IProps {
	searchForm: ISearchForm;
	handleSearchChange: (e: object) => void;
	handleSearch: () => void;
	PushStatusList: SelectOption[];
	ToppingStatusList: SelectOption[];
	OfficalStatusList: SelectOption[];
	ColumnList: SelectOption[];
}

interface ISearchForm {
	userName: string;
	title: string;
	keyword: string;
	status: number;
	toppingStat: number;
	officalStat: number;
	columnId: number;
}

const normalizeSelectValue = (value: number, stringify = false) => {
	if (value === -1) return undefined;
	return stringify ? String(value) : value;
};

const normalizeSearchValue = (value: number | string | undefined) => (value === undefined ? -1 : Number(value));

const Search: FC<IProps> = ({ searchForm, handleSearchChange, handleSearch, PushStatusList, ToppingStatusList, OfficalStatusList, ColumnList }) => {
	const navigate = useNavigate();
	return (
		<div className="article-search">
			{/* 搜索 */}
			<ContentInterWrap className="article-search__wrap">
				<div className="article-search__search">
					<div className="article-search__search-item article-search__search-item--keyword">
						<Input
							allowClear
							placeholder="搜索标题/摘要/正文"
							style={{ width: 220 }}
							value={searchForm.keyword}
							onChange={e => handleSearchChange({ keyword: e.target.value })}
						/>
					</div>
					<div className="article-search__search-item">
						{/* 增加一个作者的查询条件 */}
						<Input
							allowClear
							placeholder="请输入作者名"
							style={{ width: 142 }}
							value={searchForm.userName}
							onChange={e => {
								handleSearchChange({ userName: e.target.value });
							}}
						/>
					</div>
					<div className="article-search__search-item">
						<Input
							allowClear
							placeholder="请输入标题"
							style={{ width: 142 }}
							value={searchForm.title}
							onChange={e => handleSearchChange({ title: e.target.value })}
						/>
					</div>
					<div className="article-search__search-item">
						<Select
							// 可以清空
							allowClear
							// 默认值
							placeholder="选择专栏"
							options={ColumnList}
							style={{ width: 180 }}
							value={normalizeSelectValue(searchForm.columnId)}
							// 触发搜索
							onChange={value => handleSearchChange({ columnId: normalizeSearchValue(value) })}
						></Select>
					</div>
					<div className="article-search__search-item">
						<Select
							// 可以清空
							allowClear
							// 默认值
							placeholder="选择状态"
							options={PushStatusList}
							style={{ width: 100 }}
							value={normalizeSelectValue(searchForm.status, true)}
							// 触发搜索
							onChange={value => handleSearchChange({ status: normalizeSearchValue(value) })}
						></Select>
					</div>
					<div className="article-search__search-item">
						<Select
							// 可以清空
							allowClear
							// 默认值
							placeholder="是否置顶"
							options={ToppingStatusList}
							style={{ width: 100 }}
							value={normalizeSelectValue(searchForm.toppingStat, true)}
							// 触发搜索
							onChange={value => handleSearchChange({ toppingStat: normalizeSearchValue(value) })}
						></Select>
					</div>
					<div className="article-search__search-item">
						<Select
							// 可以清空
							allowClear
							// 默认值
							placeholder="是否推荐"
							options={OfficalStatusList}
							style={{ width: 100 }}
							value={normalizeSelectValue(searchForm.officalStat, true)}
							// 触发搜索
							onChange={value => handleSearchChange({ officalStat: normalizeSearchValue(value) })}
						></Select>
					</div>
					<div className="article-search__search-btn">
						<Tooltip title="按条件搜索">
							<Button type="primary" icon={<SearchOutlined />} style={{ marginRight: "10px" }} onClick={handleSearch}>
							</Button>
						</Tooltip>
						<Tooltip title="新增文章">
							<Button type="primary" icon={<PlusCircleOutlined />}  
								style={{ marginRight: "20px" }} 
								onClick={() => {navigate("/article/edit/index");}}>
							</Button>
						</Tooltip>
					</div>
				</div>
			</ContentInterWrap>
		</div>
	);
};
export default Search;
