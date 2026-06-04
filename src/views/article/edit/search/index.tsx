/* eslint-disable prettier/prettier */
import { FC } from "react";
import { ArrowLeftOutlined, DownOutlined, FileTextOutlined, FileWordOutlined, RetweetOutlined, SaveOutlined, UploadOutlined, VideoCameraOutlined } from "@ant-design/icons";
import { Button, Dropdown, Tooltip } from "antd";

import { ContentInterWrap } from "@/components/common-wrap";
import { UpdateEnum } from "@/enums/common";

import "./index.scss";

interface IProps {
	handleSave: (e: object) => void;
	handleReplaceImgUrl: (e: object) => void;
	handleImportWord: () => void;
	handleImportMarkdown: () => void;
	handleOverwriteMarkdown: () => void;
	handleUploadVideo: () => void;
	importedMarkdownFileName: string;
	canOverwriteMarkdown: boolean;
	goBack: () => void;
	status: number;
}

const Search: FC<IProps> = ({
	handleSave,
	goBack,
	status,
	handleReplaceImgUrl,
	handleImportWord,
	handleImportMarkdown,
	handleOverwriteMarkdown,
	handleUploadVideo,
	importedMarkdownFileName,
	canOverwriteMarkdown
}) => {
	const overwriteTip = importedMarkdownFileName
		? canOverwriteMarkdown
			? `覆盖 ${importedMarkdownFileName}`
			: "当前导入方式不能写回原文件，请在 Chrome/Edge 下重新导入"
		: "导入 Markdown 后可覆盖源文件";
	const importItems = [
		{
			key: "word",
			icon: <FileWordOutlined />,
			label: "导入 Word"
		},
		{
			key: "markdown",
			icon: <FileTextOutlined />,
			label: "导入 Markdown"
		}
	];

	return (
		<div className="article-edit-search">
			{/* 搜索 */}
			<ContentInterWrap className="article-edit-search__wrap">
				<div className="article-edit-search__search">
					<div className="article-edit-search__search-item">
						<Button onClick={goBack}><ArrowLeftOutlined />返回文章列表</Button>
					</div>
					<div className="article-edit-search__search-btn">
						<Dropdown
							menu={{
								items: importItems,
								onClick: ({ key }) => {
									if (key === "word") {
										handleImportWord();
										return;
									}
									if (key === "markdown") {
										handleImportMarkdown();
									}
								}
							}}
						>
							<Button type="default" icon={<UploadOutlined />} style={{ marginRight: "10px" }}>
								导入 <DownOutlined />
							</Button>
						</Dropdown>

						<Tooltip title={overwriteTip}>
							<span style={{ display: "inline-block", marginRight: "10px" }}>
								<Button type="default"
									icon={<SaveOutlined />}
									disabled={!importedMarkdownFileName}
									onClick={handleOverwriteMarkdown}>
									覆盖源文件
								</Button>
							</span>
						</Tooltip>

						<Button type="default"
							icon={<VideoCameraOutlined />}
							style={{ marginRight: "10px" }}
							onClick={handleUploadVideo}>
							上传视频
						</Button>

						<Button type="primary" 
							icon={<RetweetOutlined />} 
							style={{ marginRight: "10px" }} 
							onClick={handleReplaceImgUrl}>
							转链
						</Button>

						<Button type="primary" icon={<SaveOutlined />} style={{ marginRight: "25px" }} onClick={handleSave}>
							{status === UpdateEnum.Edit ? "更新" : "保存"}
						</Button>
					</div>
				</div>
			</ContentInterWrap>
		</div>
	);
};
export default Search;
