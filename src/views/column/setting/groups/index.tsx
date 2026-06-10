/* eslint-disable react/jsx-no-comment-textnodes */
/* eslint-disable prettier/prettier */
import { FC, useEffect, useRef, useState } from "react";
import React from "react";
import { connect } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import {
	DeleteOutlined,
	EditOutlined,
	EyeOutlined,
	FileTextOutlined,
	FormOutlined,
	ImportOutlined,
	LinkOutlined,
	PlusOutlined,
	RobotOutlined,
	SaveOutlined,
	SettingOutlined
} from "@ant-design/icons";
import { Alert, Button, Card, Drawer, Form, Input, InputNumber, message, Modal, Radio, Space, Tag, Tooltip, Tree } from "antd";
import type { DataNode } from "antd/es/tree";

import { generateArticleSlugApi, updateArticleSlugApi } from "@/api/modules/article";
import {
	delColumnArticleApi,
	deleteGroupApi,
	getColumnDetailApi,
	getColumnGroupArticlesApi,
	getColumnReadmeApi,
	initColumnReadmeApi,
	moveColumnArticleOrGroup,
	saveColumnReadmeApi,
	updateColumnArticleApi,
	updateGroupApi
} from "@/api/modules/column";
import { UpdateEnum } from "@/enums/common";
import { MapItem } from "@/typings/common";
import { baseDomain } from "@/utils/util";
import TableSelect from "@/views/column/article/components/tableselect/TableSelect";

import "./index.scss";

interface IProps {}

interface GroupData {
	columnId: number;
	groupId: number;
	parentGroupId: number;
	title: string;
	section: number;
	children: GroupData[];
	articles: DataType[];
}

// 教程文章的数据类型
interface DataType {
	key: string;
	id: number;
	articleId: string;
	title: string;
	urlSlug: string;
	shortTitle: string;
	columnId: number;
	column: string;
	sort: number;
	groupId: number;
	readType?: number;
	previewPercent?: number;
}

interface ColumnGroupsRouteState {
	columnId?: number | string;
	column?: string;
	urlSlug?: string;
}

export interface IMoveType {
	columnId: number;
	moveArticleId?: number;
	moveGroupId?: number;
	targetArticleId?: number;
	targetGroupId?: number;
	movePosition: number;
}

export interface IFormType {
	id: number; // 主键id
	articleId: number; // 文章ID
	title: string; // 文章标题
	shortTitle: string; // 文章短标题
	columnId: number; // 教程ID
	column: string; // 教程名
	sort: number; // 排序
	groupId: number; // 分组id
	groupName: string; // 分组名
	read?: number; // 教程文章阅读类型
	previewPercent?: number; // 未解锁试看比例
}

const defaultInitForm: IFormType = {
	id: -1,
	articleId: -1,
	title: "",
	shortTitle: "",
	columnId: -1,
	column: "",
	sort: -1,
	groupId: 0,
	groupName: "",
	read: 0,
	previewPercent: 0
};

const articleReadOptions = [
	{ label: "沿用专栏", value: 0 },
	{ label: "登录阅读", value: 1 },
	{ label: "试读", value: 2 },
	{ label: "星球 VIP", value: 3 }
];

const getReadTag = (readType?: number) => {
	switch (readType) {
		case 1:
			return <Tag color="blue">登录</Tag>;
		case 2:
			return <Tag color="green">试读</Tag>;
		case 3:
			return <Tag color="gold">星球</Tag>;
		default:
			return <Tag>沿用</Tag>;
	}
};

const normalizeUrlSlug = (value?: string) =>
	String(value || "")
		.trim()
		.toLowerCase();

const isValidUrlSlug = (value?: string) => {
	const urlSlug = normalizeUrlSlug(value);
	return !!urlSlug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(urlSlug) && !/^\d+$/.test(urlSlug);
};

const EXPANDED_KEYS_STORAGE_PREFIX = "paicoding-admin:column-groups:expanded";
const COLUMN_GROUPS_CONTEXT_STORAGE_KEY = "paicoding-admin:column-groups:context";

const getExpandedKeysStorageKey = (columnId?: number | string) =>
	columnId ? `${EXPANDED_KEYS_STORAGE_PREFIX}:${columnId}` : "";

const readStoredExpandedKeys = (storageKey: string): React.Key[] => {
	if (!storageKey || typeof window === "undefined") return [];
	try {
		const parsed = JSON.parse(window.localStorage.getItem(storageKey) || window.sessionStorage.getItem(storageKey) || "[]");
		return Array.isArray(parsed) ? parsed.filter(key => typeof key === "string" || typeof key === "number") : [];
	} catch (error) {
		return [];
	}
};

const writeStoredExpandedKeys = (storageKey: string, keys: React.Key[]) => {
	if (!storageKey || typeof window === "undefined") return;
	const value = JSON.stringify(keys);
	window.localStorage.setItem(storageKey, value);
	window.sessionStorage.setItem(storageKey, value);
};

const readStoredColumnGroupsContext = (): ColumnGroupsRouteState => {
	if (typeof window === "undefined") return {};
	try {
		const parsed = JSON.parse(
			window.localStorage.getItem(COLUMN_GROUPS_CONTEXT_STORAGE_KEY) ||
				window.sessionStorage.getItem(COLUMN_GROUPS_CONTEXT_STORAGE_KEY) ||
				"{}"
		);
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch (error) {
		return {};
	}
};

const writeStoredColumnGroupsContext = (context: ColumnGroupsRouteState) => {
	if (!context.columnId || typeof window === "undefined") return;
	const value = JSON.stringify(context);
	window.localStorage.setItem(COLUMN_GROUPS_CONTEXT_STORAGE_KEY, value);
	window.sessionStorage.setItem(COLUMN_GROUPS_CONTEXT_STORAGE_KEY, value);
};

const normalizeColumnId = (value?: number | string) => {
	const columnId = Number(value);
	return Number.isFinite(columnId) && columnId > 0 ? columnId : 0;
};

const ColumnArticle: FC<IProps> = props => {
	const [formRef] = Form.useForm();
	const [slugFormRef] = Form.useForm();
	const [accessFormRef] = Form.useForm();
	const selectedImportRead = Form.useWatch("read", formRef) ?? 0;
	const selectedAccessRead = Form.useWatch("read", accessFormRef) ?? 0;
	// 分组列表数据
	const [groupTree, setGroupTree] = useState<GroupData[]>([]);

	const [currentGroup, setCurrentGroup] = useState<GroupData>();
	const [newGroupName, setNewGroupName] = useState<string>("");
	const [isAddModalVisible, setIsAddModalVisible] = useState<boolean>(false);
	const [isEditModalVisible, setIsEditModalVisible] = useState<boolean>(false);
	const [isImportDrawerVisible, setIsImportDrawerVisible] = useState<boolean>(false);

	const location = useLocation();
	const navigate = useNavigate();
	const routeState = (location.state || {}) as ColumnGroupsRouteState;
	const storedRouteState = readStoredColumnGroupsContext();
	const columnGroupsState = routeState.columnId ? routeState : storedRouteState;
	const columnIdParam = normalizeColumnId(columnGroupsState.columnId);
	const { column: columnParam, urlSlug: columnUrlSlug } = columnGroupsState;
	const [currentColumnUrlSlug, setCurrentColumnUrlSlug] = useState<string>(columnUrlSlug || "");
	const [currentSlugArticle, setCurrentSlugArticle] = useState<DataType>();
	const [isSlugModalVisible, setIsSlugModalVisible] = useState<boolean>(false);
	const [currentAccessArticle, setCurrentAccessArticle] = useState<DataType>();
	const [isAccessModalVisible, setIsAccessModalVisible] = useState<boolean>(false);
	const [editingUrlSlug, setEditingUrlSlug] = useState<string>("");
	const [slugGenerating, setSlugGenerating] = useState<boolean>(false);
	const [slugSaving, setSlugSaving] = useState<boolean>(false);
	const [isReadmeDrawerVisible, setIsReadmeDrawerVisible] = useState<boolean>(false);
	const [readmeContent, setReadmeContent] = useState<string>("");
	const [readmeTitle, setReadmeTitle] = useState<string>("");
	const [readmeLoading, setReadmeLoading] = useState<boolean>(false);
	const [readmeSaving, setReadmeSaving] = useState<boolean>(false);
	const [readmeInitializing, setReadmeInitializing] = useState<boolean>(false);

	const buildArticlePreviewUrl = (article: DataType) => {
		return article.urlSlug
			? `${baseDomain}/${article.urlSlug}`
			: `${baseDomain}/column/${currentColumnUrlSlug || columnIdParam}/${article.sort}`;
	};

	const buildColumnPreviewUrl = () => `${baseDomain}/column/${currentColumnUrlSlug || columnIdParam}`;

	const openColumnPreview = () => {
		window.open(buildColumnPreviewUrl(), "_blank", "noreferrer");
	};

	const handleEditArticle = (article: DataType) => {
		navigate("/article/edit/index", {
			state: {
				articleId: Number(article.articleId),
				status: UpdateEnum.Edit
			}
		});
	};

	const fetchColumnMeta = async () => {
		if (!columnIdParam) return;
		const { status, result } = await getColumnDetailApi(columnIdParam);
		const { code } = status || {};
		if (code === 0 && result) {
			const column = result as { urlSlug?: string };
			setCurrentColumnUrlSlug(column.urlSlug || "");
		}
	};

	const fetchTreeData = async () => {
		if (!columnIdParam) return;
		const { status, result } = await getColumnGroupArticlesApi(columnIdParam);
		const { code } = status || {};
		// @ts-ignore
		if (code === 0) {
			const newList = (result as GroupData[]).map((item: GroupData) => ({ ...item, key: item?.groupId }));
			setGroupTree(newList as unknown as GroupData[]);
			restoringExpandedKeysRef.current = true;
			setExpandedKeys(readStoredExpandedKeys(getExpandedKeysStorageKey(columnIdParam)));
			setAutoExpandParent(true);
			console.log("获取到的groupTree:", groupTree);
		}
	};

	// 数据请求
	useEffect(() => {
		writeStoredColumnGroupsContext(columnGroupsState);
		fetchColumnMeta();
		fetchTreeData();
	}, [columnIdParam]);

	// 递归构建树节点
	const buildTreeNodes = (groups: GroupData[]): DataNode[] => {
		return groups.map(group => {
			const childrenNodes: DataNode[] = [];

			// 优先添加子分组
			if (group.children && group.children.length > 0) {
				childrenNodes.push(...buildTreeNodes(group.children));
			}

			// 然后添加文章
			if (group.articles && group.articles.length > 0) {
				group.articles.forEach(article => {
					const articleId = Number(article.articleId);
					childrenNodes.push({
						key: `article-${article.articleId}`,
						title: (
							<div className="tree-node-row">
								<span className="tree-node-title">
									<span className="tree-node-id">{article.articleId}</span>
									<span className="tree-node-name">{article.shortTitle || article.title}</span>
									{article.urlSlug && <span className="tree-node-slug">/{article.urlSlug}</span>}
									<span className="tree-node-tag">{getReadTag(article.readType)}</span>
									{article.readType !== 2 && !!article.previewPercent && article.previewPercent > 0 && (
										<Tag className="tree-node-tag" color="purple">
											开放 {article.previewPercent}%
										</Tag>
									)}
								</span>
								<div className="group-node-buttons">
									<Tooltip title="访问设置">
										<Button
											type="text"
											size="small"
											icon={<SettingOutlined />}
											onClick={e => {
												e.stopPropagation();
												openAccessModal(article);
											}}
										/>
									</Tooltip>
									<Tooltip title="修改 URL Slug">
										<Button
											type="text"
											size="small"
											icon={<LinkOutlined />}
											onClick={e => {
												e.stopPropagation();
												openSlugModal(article);
											}}
										/>
									</Tooltip>
									<Tooltip title="编辑文章">
										<Button
											type="text"
											size="small"
											icon={<FormOutlined />}
											onClick={e => {
												e.stopPropagation();
												handleEditArticle(article);
											}}
										/>
									</Tooltip>
									<Tooltip title="预览教程">
										<Button
											type="text"
											size="small"
											icon={<EyeOutlined />}
											onClick={e => {
												e.stopPropagation();
												window.open(buildArticlePreviewUrl(article), "_blank", "noreferrer");
											}}
										/>
									</Tooltip>
									<Button
										type="text"
										size="small"
										danger
										icon={<DeleteOutlined />}
										onClick={e => {
											e.stopPropagation();
											handleDeleteColumnArticle(article.id, articleId);
										}}
									/>
								</div>
							</div>
						),
						icon: <span className="article-icon">📄</span>,
						className: "article-node"
					});
				});
			}

			return {
				key: `group-${group.groupId}`,
				title: (
					<div className="tree-node-row">
						<span className="tree-node-title">
							<span className="tree-node-id">{group.groupId}</span>
							<span className="tree-node-name">{group.title}</span>
						</span>
						<Space size="small" className="tree-node-actions">
							<div className="group-node-buttons">
								<Button
									type="link"
									size="small"
									icon={<PlusOutlined />}
									onClick={e => {
										e.stopPropagation();
										setCurrentGroup(group);
										setNewGroupName("");
										setIsAddModalVisible(true);
									}}
								/>
								<Button
									type="link"
									size="small"
									icon={<EditOutlined />}
									onClick={e => {
										e.stopPropagation();
										setCurrentGroup(group);
										setNewGroupName(group.title);
										setIsEditModalVisible(true);
									}}
								/>
								<Button
									type="link"
									size="small"
									icon={<ImportOutlined />}
									onClick={e => {
										e.stopPropagation();
										setCurrentGroup(group);
										setForm(defaultInitForm);
										formRef.resetFields();
										formRef.setFieldsValue({ groupId: group.groupId, read: 0, previewPercent: 0 });
										setIsImportDrawerVisible(true);
									}}
								></Button>
							</div>
						</Space>
					</div>
				),
				icon: <span className="group-icon">📁</span>,
				children: childrenNodes.length > 0 ? childrenNodes : undefined,
				className: "group-node"
			};
		});
	};

	const treeData = buildTreeNodes(groupTree);

	const expandedKeysStorageKey = getExpandedKeysStorageKey(columnIdParam);
	// 控制节点展开/收起的状态
	const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(() => readStoredExpandedKeys(expandedKeysStorageKey));
	const [autoExpandParent, setAutoExpandParent] = useState(true);
	const restoringExpandedKeysRef = useRef(false);

	useEffect(() => {
		restoringExpandedKeysRef.current = true;
		setExpandedKeys(readStoredExpandedKeys(expandedKeysStorageKey));
		setAutoExpandParent(true);
	}, [expandedKeysStorageKey]);

	useEffect(() => {
		if (restoringExpandedKeysRef.current) {
			restoringExpandedKeysRef.current = false;
			return;
		}
		writeStoredExpandedKeys(expandedKeysStorageKey, expandedKeys);
	}, [expandedKeysStorageKey, expandedKeys]);

	const updateExpandedKeys = (keys: React.Key[]) => {
		setExpandedKeys(keys);
		writeStoredExpandedKeys(expandedKeysStorageKey, keys);
	};

	// 处理节点展开/收起
	const onExpand = (expandedKeysValue: React.Key[]) => {
		console.log("onExpand", expandedKeysValue);
		// 如果你不想节点收起，可以删除下面这行
		updateExpandedKeys(expandedKeysValue);
		setAutoExpandParent(false);
	};

	// 处理节点选择
	const onSelect = (selectedKeysValue: React.Key[], info: any) => {
		console.log("selected", selectedKeysValue, info);
		// 如果点击的是分组节点，则切换展开/收起状态
		if (info.node.key.startsWith("group-")) {
			const key = info.node.key;
			if (expandedKeys.includes(key)) {
				// 如果已经展开，则收起
				updateExpandedKeys(expandedKeys.filter(k => k !== key));
			} else {
				// 如果已经收起，则展开
				updateExpandedKeys([...expandedKeys, key]);
			}
		}
	};

	const handleSaveNewGroup = async () => {
		// 添加分组
		if (!newGroupName.trim()) {
			message.warning("请输入分组名称");
			return;
		}

		// 构造分组数据
		const groupData = {
			id: 0, // 新增分组id为0
			columnId: columnIdParam, // 使用当前专栏ID
			parentGroupId: currentGroup?.groupId || 0, // 默认为顶级分组
			title: newGroupName.trim(),
			section: 0 // 默认排序为0
		};

		try {
			const { status } = await updateGroupApi(groupData);
			const { code, msg } = status || {};

			if (code === 0) {
				message.success("分组添加成功");
				await fetchTreeData();
				setIsAddModalVisible(false);
			} else {
				message.error(msg || "分组添加失败");
			}
		} catch (error) {
			message.error("分组添加失败");
		}
	};
	const handleUpdateGroup = async () => {
		// 更新分组
		if (!currentGroup || !newGroupName.trim()) {
			message.warning("请输入分组名称");
			return;
		}
		// 构造分组数据
		const groupData = {
			id: currentGroup.groupId, // 新增分组id为0
			columnId: columnIdParam, // 使用当前专栏ID
			parentGroupId: currentGroup.parentGroupId, // 默认为顶级分组
			title: newGroupName.trim(),
			section: currentGroup.section // 默认排序为0
		};

		try {
			const { status } = await updateGroupApi(groupData);
			const { code, msg } = status || {};

			if (code === 0) {
				message.success("分组添加成功");
				await fetchTreeData();
				setIsEditModalVisible(false);
			} else {
				message.error(msg || "分组添加失败");
			}
		} catch (error) {
			message.error("删除分组失败~");
		}
	};

	const handleDeleteGroup = async () => {
		// 更新分组
		if (!currentGroup || !newGroupName.trim()) return;
		try {
			const { status } = await deleteGroupApi(currentGroup.groupId);
			const { code, msg } = status || {};

			if (code === 0) {
				message.success("删除添加成功");
				await fetchTreeData();
				setIsEditModalVisible(false);
			} else {
				message.error(msg || "删除失败");
			}
		} catch (error) {
			message.error("分组添加失败");
		}
	};

	const handleDeleteColumnArticle = async (id: number, articleId: number) => {
		// 删除专栏中的教程
		Modal.warning({
			title: "确认删除此专栏的教程吗",
			content: "删除此专栏的教程后无法恢复，请谨慎操作！",
			maskClosable: true,
			closable: true,
			onOk: async () => {
				const { status } = await delColumnArticleApi(id);
				const { code, msg } = status || {};
				if (code === 0) {
					message.success("删除成功");
					await fetchTreeData();
				} else {
					message.error(msg);
				}
			}
		});
	};

	const openAccessModal = (article: DataType) => {
		setCurrentAccessArticle(article);
		accessFormRef.setFieldsValue({
			read: article.readType ?? 0,
			previewPercent: article.previewPercent ?? 0
		});
		setIsAccessModalVisible(true);
	};

	const handleSaveArticleAccess = async () => {
		if (!currentAccessArticle) return;
		const values = await accessFormRef.validateFields();
		const read = Number(values.read ?? 0);
		const previewPercent = read === 2 ? 0 : Number(values.previewPercent ?? 0);
		const payload: IFormType = {
			id: currentAccessArticle.id,
			articleId: Number(currentAccessArticle.articleId),
			title: currentAccessArticle.title,
			shortTitle: currentAccessArticle.shortTitle || currentAccessArticle.title,
			columnId: columnIdParam,
			column: currentAccessArticle.column,
			sort: currentAccessArticle.sort,
			groupId: currentAccessArticle.groupId || 0,
			groupName: "",
			read,
			previewPercent
		};

		const { status: successStatus } = (await updateColumnArticleApi(payload)) || {};
		const { code, msg } = successStatus || {};
		if (code === 0) {
			message.success("教程访问设置已保存");
			setIsAccessModalVisible(false);
			await fetchTreeData();
		} else {
			message.error(msg || "教程访问设置保存失败");
		}
	};

	const openSlugModal = (article: DataType) => {
		const urlSlug = normalizeUrlSlug(article.urlSlug);
		setCurrentSlugArticle(article);
		setEditingUrlSlug(urlSlug);
		slugFormRef.setFieldsValue({ urlSlug });
		setIsSlugModalVisible(true);
	};

	const handleGenerateArticleSlug = async () => {
		if (!currentSlugArticle) return;
		setSlugGenerating(true);
		try {
			const { status, result } =
				(await generateArticleSlugApi({
					title: currentSlugArticle.title,
					shortTitle: currentSlugArticle.shortTitle,
					articleId: currentSlugArticle.articleId,
					columnUrlSlug: currentColumnUrlSlug
				})) || {};
			const { code, msg } = status || {};
			if (code === 0 && result) {
				const urlSlug = normalizeUrlSlug(String(result));
				setEditingUrlSlug(urlSlug);
				slugFormRef.setFieldsValue({ urlSlug });
				message.success("语义 URL 生成成功");
			} else {
				message.error(msg || "语义 URL 生成失败");
			}
		} finally {
			setSlugGenerating(false);
		}
	};

	const handleSaveArticleSlug = async () => {
		if (!currentSlugArticle) return;
		const values = await slugFormRef.validateFields();
		const urlSlug = normalizeUrlSlug(values.urlSlug);
		setSlugSaving(true);
		try {
			const { status, result } =
				(await updateArticleSlugApi({
					articleId: currentSlugArticle.articleId,
					columnId: columnIdParam,
					urlSlug
				})) || {};
			const { code, msg } = status || {};
			if (code === 0) {
				message.success(`URL Slug 已更新为 ${result || urlSlug}`);
				setIsSlugModalVisible(false);
				await fetchTreeData();
			} else {
				message.error(msg || "URL Slug 更新失败");
			}
		} finally {
			setSlugSaving(false);
		}
	};

	const handleSlugInputChange = (value: string) => {
		const urlSlug = normalizeUrlSlug(value);
		setEditingUrlSlug(urlSlug);
		slugFormRef.setFieldsValue({ urlSlug });
	};

	const fetchReadme = async () => {
		if (!columnIdParam) return;
		setReadmeLoading(true);
		try {
			const { status, result } = (await getColumnReadmeApi(columnIdParam)) || {};
			const { code, msg } = status || {};
			if (code === 0 && result) {
				setReadmeContent(result.content || "");
				setReadmeTitle(result.title || "");
				if (result.created) {
					message.info("已生成默认 README，可继续编辑后保存");
				}
			} else {
				message.error(msg || "README 加载失败");
			}
		} finally {
			setReadmeLoading(false);
		}
	};

	const openReadmeDrawer = async () => {
		setIsReadmeDrawerVisible(true);
		await fetchReadme();
	};

	const handleInitReadme = () => {
		Modal.confirm({
			title: "用第一篇教程初始化 README？",
			content: "这会覆盖当前编辑框中的内容，但不会直接保存；确认内容后还需要手动点击保存。",
			okText: "初始化草稿",
			cancelText: "取消",
			onOk: async () => {
				if (!columnIdParam) return;
				setReadmeInitializing(true);
				try {
					const { status, result } = (await initColumnReadmeApi({ columnId: columnIdParam })) || {};
					const { code, msg } = status || {};
					if (code === 0 && result) {
						setReadmeContent(result.content || "");
						setReadmeTitle(result.title || "");
						message.success("README 草稿已生成，请检查后保存");
					} else {
						message.error(msg || "README 初始化失败");
					}
				} finally {
					setReadmeInitializing(false);
				}
			}
		});
	};

	const handleSaveReadme = async (previewAfterSave = false) => {
		if (!columnIdParam) return;
		setReadmeSaving(true);
		try {
			const { status, result } =
				(await saveColumnReadmeApi({
					columnId: columnIdParam,
					content: readmeContent
				})) || {};
			const { code, msg } = status || {};
			if (code === 0 && result) {
				setReadmeContent(result.content || "");
				setReadmeTitle(result.title || "");
				message.success("README 已保存");
				if (previewAfterSave) {
					openColumnPreview();
				}
			} else {
				message.error(msg || "README 保存失败");
			}
		} finally {
			setReadmeSaving(false);
		}
	};

	// 专栏内容进行拖拽，支持文章 拖拽； 分组拖拽
	const handleDrop = async (info: any) => {
		const { dragNode, node, dropToGap } = info;
		console.log("info对象", info);
		console.log("拖拽的对象:", dragNode);
		console.log("目标对象:", node);

		// -1：移动到和dropKey的平级，并在其上面(即info.dropPosition比dropKey的下标小一个)
		// 1：移动到和dropKey的平级，并在其下面(info.dropPosition比dropKey的下标大一个)
		// 0：是移动到dropKey下面作为他的子级(info.dropPosition和dropKey的下标同样大
		const dropPos = info.node.pos.split("-");
		const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);
		console.log("dropPosition:", dropPosition);

		// - true ：放置在目标节点旁边（同级节点）
		// - false ：放置在目标节点内部（子节点）
		console.log("dropToGap:", dropToGap);

		const articleId = parseInt(dragNode.key.split("-")[1]);
		const targetId = parseInt(node.key.split("-")[1]);
		if (dragNode.key.startsWith("article-")) {
			let moveForm = {
				columnId: columnIdParam,
				movePosition: 0,
				moveArticleId: articleId,
				targetArticleId: 0,
				targetGroupId: 0,
				tag: ""
			};
			if (node.key.startsWith("group-")) {
				// 判断是否是文章节点被拖拽到分组节点的前\后\里
				moveForm.targetGroupId = targetId;
				moveForm.movePosition = dropPosition;
				if (dropPosition == 1) moveForm.tag = "后";
				else if (dropPosition == 0) moveForm.tag = "里";
				else moveForm.tag = "前";
			} else {
				// 目标为文章
				moveForm.targetArticleId = targetId;
				if (!dropToGap || dropPosition == 1) {
					// 移动到目标文章的后面
					moveForm.movePosition = 1;
					moveForm.tag = "后";
				} else {
					// 移动到目标文章的前面
					moveForm.movePosition = -1;
					moveForm.tag = "前";
				}
			}
			console.log(`移动教程啦： 将 ${articleId} 移动到 ${targetId} ${moveForm.tag}`);
			await moveData(moveForm);
		} else {
			// 分组的移动
			let moveForm = {
				columnId: columnIdParam,
				movePosition: 0,
				moveGroupId: articleId,
				targetArticleId: 0,
				targetGroupId: targetId,
				tag: ""
			};
			if (node.key.startsWith("group-")) {
				// 往目标分组移动
				moveForm.movePosition = dropPosition;
				if (dropPosition == 1) moveForm.tag = "后";
				else if (dropPosition == 0) moveForm.tag = "里";
				else moveForm.tag = "前";
			} else {
				// 往文章边上移动，不支持
				message.warning("请勿将分组移动到教程前后!");
				return;
			}
			console.log(`移动分组啦： 将 ${articleId} 移动到 ${targetId} ${moveForm.tag}`);
			await moveData(moveForm);
		}
	};
	const moveData = async (moveForm: IMoveType) => {
		const { status: successStatus } = (await moveColumnArticleOrGroup(moveForm)) || {};
		const { code, msg } = successStatus || {};
		if (code === 0) {
			// 需要刷新一下列表
			await fetchTreeData();
		} else {
			message.error(msg);
		}
	};

	//  ------------------------------------------------------- 下面是在专栏的分组中添加教程 ------------------------------------------
	// form值（详情和新增的时候会用到）
	const [form, setForm] = useState<IFormType>(defaultInitForm);
	// 文章选择下拉框是否打开
	const [isArticleSelectOpen, setIsArticleSelectOpen] = useState<boolean>(false);
	// 详情信息
	const { shortTitle } = form;

	// 值改变（新增教程文章时，老的做法，将 formRef 放到了这里，不太好）
	const handleChange = (item: MapItem) => {
		console.log("选中的内容: ", item);
		setForm({ ...form, ...item });
		formRef.setFieldsValue({ ...item });
	};
	const reviseDrawerContent = (
		<Form name="basic" form={formRef} labelCol={{ span: 4 }} wrapperCol={{ span: 16 }} autoComplete="off">
			<Form.Item label="分组">
				{currentGroup?.title}
			</Form.Item>

			<Form.Item label="教程" name="articleId" rules={[{ required: true, message: "请选择教程!" }]}>
				<TableSelect
					isArticleSelectOpen={isArticleSelectOpen}
					setIsArticleSelectOpen={setIsArticleSelectOpen}
					handleChange={handleChange}
				/>
			</Form.Item>

			<Form.Item label="标题" name="shortTitle" rules={[{ required: true, message: "请输入标题!" }]}>
				<Input
					allowClear
					placeholder="请输入标题"
					value={shortTitle}
					onChange={e => handleChange({ shortTitle: e.target.value })}
				/>
			</Form.Item>

			<Form.Item label="阅读类型" name="read" initialValue={0}>
				<Radio.Group options={articleReadOptions} optionType="button" buttonStyle="solid" />
			</Form.Item>

			<Form.Item
				label="开放比例"
				name="previewPercent"
				initialValue={0}
				extra="0 表示沿用全局试看字数；试读会全文开放，并在用户端标记为试读"
			>
				<InputNumber min={0} max={99} addonAfter="%" disabled={selectedImportRead === 2} />
			</Form.Item>
		</Form>
	);

	// 添加教程文章，编辑取消了
	const handleSubmit = async () => {
		const values = await formRef.validateFields();
		const newValues = {
			...values,
			columnId: columnIdParam,
			groupId: currentGroup?.groupId || 0,
			read: Number(values.read ?? 0),
			previewPercent: Number(values.read ?? 0) === 2 ? 0 : Number(values.previewPercent ?? 0)
		};
		console.log("提交的值:", newValues);

		const { status: successStatus } = (await updateColumnArticleApi(newValues)) || {};
		const { code, msg } = successStatus || {};
		if (code === 0) {
			setIsImportDrawerVisible(false);
			message.info("教程添加成功");
			// 需要刷新一下列表
			await fetchTreeData();
		} else {
			message.error(msg);
		}
	};

	return (
		<div className="ColumnArticle">
			<Card
				title={"《" + columnParam + "》"}
				extra={
					<Space>
						<Button icon={<FileTextOutlined />} onClick={openReadmeDrawer}>
							编辑 README
						</Button>
						<Button
							icon={<PlusOutlined />}
							onClick={() => {
								// 显示添加分组弹窗
								setCurrentGroup(undefined);
								setIsAddModalVisible(true);
							}}
						>
							新增分组
						</Button>
					</Space>
				}
			>
				<Tree
					className="group-tree"
					showIcon
					defaultExpandAll={false}
					expandedKeys={expandedKeys}
					autoExpandParent={autoExpandParent}
					onExpand={onExpand}
					onSelect={onSelect}
					treeData={treeData}
					draggable={true}
					onDrop={handleDrop}
				/>
			</Card>
			<Modal
				title="添加子目录"
				open={isAddModalVisible}
				onCancel={() => setIsAddModalVisible(false)}
				footer={[
					<Button key="cancel" onClick={() => setIsAddModalVisible(false)}>
						取消
					</Button>,
					<Button key="save" type="primary" onClick={handleSaveNewGroup}>
						保存
					</Button>
				]}
			>
				<Input placeholder="请输入子目录名称" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
			</Modal>
			<Modal
				title="编辑目录"
				open={isEditModalVisible}
				onCancel={() => setIsEditModalVisible(false)}
				footer={[
					<Button key="cancel" onClick={() => setIsEditModalVisible(false)}>
						取消
					</Button>,
					<Button key="save" type="primary" onClick={handleUpdateGroup}>
						保存
					</Button>,
					<Button key="delete" type="primary" danger onClick={handleDeleteGroup}>
						删除
					</Button>
				]}
			>
				<Input placeholder="请输入目录名称" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
			</Modal>
			<Modal
				title="修改教程文章 URL Slug"
				open={isSlugModalVisible}
				onCancel={() => setIsSlugModalVisible(false)}
				footer={[
					<Button key="cancel" onClick={() => setIsSlugModalVisible(false)}>
						取消
					</Button>,
					<Button key="generate" loading={slugGenerating} onClick={handleGenerateArticleSlug}>
						AI 生成
					</Button>,
					<Button key="save" type="primary" loading={slugSaving} onClick={handleSaveArticleSlug}>
						保存
					</Button>
				]}
			>
				<Form form={slugFormRef} layout="vertical" autoComplete="off">
					<Form.Item label="文章标题">
						<span>{currentSlugArticle?.shortTitle || currentSlugArticle?.title || "-"}</span>
					</Form.Item>
					<Form.Item label="专栏 URL">
						<span>{currentColumnUrlSlug ? `/${currentColumnUrlSlug}` : "-"}</span>
					</Form.Item>
					<Form.Item
						label="文章 URL Slug"
						name="urlSlug"
						rules={[
							{
								validator: (_, value) =>
									isValidUrlSlug(value)
										? Promise.resolve()
										: Promise.reject(new Error("只能包含小写字母、数字和连字符，且不能是纯数字"))
							}
						]}
						extra={
							currentColumnUrlSlug
								? `文章访问路径示例：${baseDomain}/${editingUrlSlug || "{slug}"}`
								: "保存后文章访问地址会使用这个 slug"
						}
					>
						<Input
							allowClear
							placeholder="例如 quickstart"
							onChange={e => {
								handleSlugInputChange(e.target.value);
							}}
						/>
					</Form.Item>
				</Form>
			</Modal>
			<Modal
				title="教程访问设置"
				open={isAccessModalVisible}
				onCancel={() => setIsAccessModalVisible(false)}
				footer={[
					<Button key="cancel" onClick={() => setIsAccessModalVisible(false)}>
						取消
					</Button>,
					<Button key="save" type="primary" onClick={handleSaveArticleAccess}>
						保存
					</Button>
				]}
			>
				<Form form={accessFormRef} layout="vertical" autoComplete="off">
					<Form.Item label="教程文章">
						<span>{currentAccessArticle?.shortTitle || currentAccessArticle?.title || "-"}</span>
					</Form.Item>
					<Form.Item label="阅读类型" name="read" initialValue={0}>
						<Radio.Group options={articleReadOptions} optionType="button" buttonStyle="solid" />
					</Form.Item>
					<Form.Item
						label="未解锁开放比例"
						name="previewPercent"
						initialValue={0}
						extra="0 表示沿用全局试看字数；试读会全文开放，并在用户端标记为试读"
					>
						<InputNumber min={0} max={99} addonAfter="%" disabled={selectedAccessRead === 2} />
					</Form.Item>
				</Form>
			</Modal>
			<Drawer
				title="添加"
				size="large"
				placement="right"
				extra={
					<Space>
						<Button onClick={() => setIsImportDrawerVisible(false)}>取消</Button>
						<Button type="primary" onClick={handleSubmit}>
							OK
						</Button>
					</Space>
				}
				onClose={() => setIsImportDrawerVisible(false)}
				open={isImportDrawerVisible}
			>
				{reviseDrawerContent}
			</Drawer>
			<Drawer
				title="编辑教程介绍页 README"
				width={900}
				placement="right"
				extra={
					<Space>
						<Button icon={<EyeOutlined />} onClick={openColumnPreview}>
							预览教程页
						</Button>
						<Button icon={<RobotOutlined />} loading={readmeInitializing} onClick={handleInitReadme}>
							从第一篇初始化
						</Button>
						<Button icon={<SaveOutlined />} loading={readmeSaving} onClick={() => handleSaveReadme()}>
							保存
						</Button>
						<Button type="primary" icon={<SaveOutlined />} loading={readmeSaving} onClick={() => handleSaveReadme(true)}>
							保存并预览
						</Button>
					</Space>
				}
				onClose={() => setIsReadmeDrawerVisible(false)}
				open={isReadmeDrawerVisible}
			>
				<div className="readme-editor">
					<Alert
						type="info"
						showIcon
						message={`README 会作为 ${buildColumnPreviewUrl()} 这个教程介绍页的主体内容展示，支持 Markdown、图片和视频。初始化只生成可编辑草稿，不会自动保存。`}
					/>
					<div className="readme-editor-meta">
						<span>{readmeTitle || "README"}</span>
						<span>{readmeContent.length} 字符</span>
					</div>
					<Input.TextArea
						value={readmeContent}
						disabled={readmeLoading}
						autoSize={{ minRows: 24, maxRows: 36 }}
						placeholder="请输入教程 README Markdown 内容"
						onChange={e => setReadmeContent(e.target.value)}
					/>
				</div>
			</Drawer>
		</div>
	);
};

const mapStateToProps = (state: any) => state.disc.disc;
const mapDispatchToProps = {};
export default connect(mapStateToProps, mapDispatchToProps)(ColumnArticle);
