import http from "@/api";
import { PORT1 } from "@/api/config/servicePort";
import { Login } from "@/api/interface/index";
import { baseDomain } from "@/utils/util";

/**
 * @name 分类模块
 */

// 获取字典值
export const getDiscListApi = () => {
	console.log("获取字典，getDiscListApi");
	return http.get(`${PORT1}/common/dict`);
};

// 上传图片
export const uploadImgApi = (data: FormData) => {
	// 添加时间戳参数，确保每个请求 URL 不同，避免被 AxiosCanceler 取消
	return http.post<Login.ResAuthButtons>(`${PORT1}/image/upload?t=${Date.now()}`, data);
};

export const createVodUploadAuthApi = (fileName: string, title?: string) => {
	const data = new URLSearchParams();
	data.append("fileName", fileName);
	if (title) data.append("title", title);
	return http.post<Login.ResAuthButtons>(`${PORT1}/video/upload/auth?t=${Date.now()}`, data, {
		headers: { "Content-Type": "application/x-www-form-urlencoded" }
	});
};

export const refreshVodUploadAuthApi = (videoId: string) => {
	const data = new URLSearchParams();
	data.append("videoId", videoId);
	return http.post<Login.ResAuthButtons>(`${PORT1}/video/upload/refresh?t=${Date.now()}`, data, {
		headers: { "Content-Type": "application/x-www-form-urlencoded" }
	});
};

// 文件上传
export const uploadFileUrl = () => {
	return `${baseDomain}/oss/upload`;
};
