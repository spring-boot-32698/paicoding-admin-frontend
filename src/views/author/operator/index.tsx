import { FC, useMemo, useState } from "react";
import { CopyOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Form, Input, message, Space, Typography } from "antd";

import { createOperatorAccountApi, OperatorAccountCreateResult } from "@/api/modules/user";
import { ContentInterWrap, ContentWrap } from "@/components/common-wrap";

import "./index.scss";

interface OperatorForm {
	username: string;
	password?: string;
	displayName?: string;
}

const genPassword = () => {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
	const randomValues = new Uint32Array(10);
	window.crypto.getRandomValues(randomValues);
	return `Pai${Array.from(randomValues)
		.map(value => chars[value % chars.length])
		.join("")}`;
};

const OperatorAccount: FC = () => {
	const [formRef] = Form.useForm<OperatorForm>();
	const [loading, setLoading] = useState(false);
	const [account, setAccount] = useState<OperatorAccountCreateResult | null>(null);

	const accountText = useMemo(() => {
		if (!account) return "";
		return [`用户名：${account.username}`, `密码：${account.password}`, `角色：运营`].join("\n");
	}, [account]);

	const handleGeneratePassword = () => {
		formRef.setFieldValue("password", genPassword());
	};

	const handleSubmit = async () => {
		const values = await formRef.validateFields();
		setLoading(true);
		try {
			const { status, result } = await createOperatorAccountApi(values);
			if (status?.code === 0 && result) {
				setAccount(result);
				message.success("运营账号创建成功");
				formRef.resetFields();
			} else {
				message.error(status?.msg || "运营账号创建失败");
			}
		} catch (error: any) {
			const code = error?.status?.code;
			const msg = error?.status?.msg || error?.message;
			if (code === 100403003) {
				message.error("登录已失效，请重新登录后再创建运营账号");
			} else {
				message.error(msg || "运营账号创建失败");
			}
		} finally {
			setLoading(false);
		}
	};

	const handleCopy = async () => {
		if (!accountText) return;
		try {
			await navigator.clipboard.writeText(accountText);
			message.success("已复制登录信息");
		} catch (e) {
			message.error("复制失败，请手动复制");
		}
	};

	return (
		<ContentWrap className="operator-account">
			<ContentInterWrap className="operator-account__wrap">
				<div className="operator-account__form">
					<Form form={formRef} layout="vertical" autoComplete="off">
						<Form.Item
							label="登录用户名"
							name="username"
							rules={[
								{ required: true, message: "请输入登录用户名" },
								{ pattern: /^[A-Za-z0-9_-]{4,32}$/, message: "4-32位字母、数字、下划线或短横线" }
							]}
						>
							<Input placeholder="operator_001" />
						</Form.Item>
						<Form.Item label="显示昵称" name="displayName">
							<Input placeholder="运营同学" />
						</Form.Item>
						<Form.Item
							label="登录密码"
							name="password"
							rules={[{ min: 8, message: "密码长度不能少于8位" }]}
							extra="留空时后端会自动生成"
						>
							<Input.Password placeholder="留空自动生成" />
						</Form.Item>
						<Space>
							<Button icon={<ReloadOutlined />} onClick={handleGeneratePassword}>
								生成密码
							</Button>
							<Button type="primary" icon={<PlusOutlined />} onClick={handleSubmit} loading={loading}>
								创建账号
							</Button>
						</Space>
					</Form>
				</div>
				<div className="operator-account__result">
					<Typography.Title level={5}>登录信息</Typography.Title>
					{account ? (
						<>
							<pre className="operator-account__credential">{accountText}</pre>
							<Button icon={<CopyOutlined />} onClick={handleCopy}>
								复制登录信息
							</Button>
						</>
					) : (
						<div className="operator-account__empty">暂无账号</div>
					)}
				</div>
			</ContentInterWrap>
		</ContentWrap>
	);
};

export default OperatorAccount;
