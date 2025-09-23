"""
服务客户端 - 统一数据访问层
封装所有API调用，解决架构不一致性问题
"""
import json
import requests  # pyright: ignore[reportMissingModuleSource]
from typing import Dict, List, Any
from pathlib import Path
import time
import logging
from urllib.parse import urlparse, urlunparse

logger = logging.getLogger(__name__)

class ServiceClientError(Exception):
    """服务客户端异常"""
    pass

class ServiceClient:
    """统一服务客户端"""
    
    def __init__(self, base_url: str, timeout: int = 10, max_retries: int = 3):
        """初始化服务客户端
        
        Args:
            base_url: 服务的基础URL，如 http://127.0.0.1:7788
            timeout: 请求超时时间（秒）
            max_retries: 最大重试次数
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.max_retries = max_retries
        
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """发起HTTP请求，带重试机制"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        for attempt in range(self.max_retries + 1):
            try:
                response = requests.request(
                    method=method,
                    url=url,
                    timeout=self.timeout,
                    **kwargs
                )
                
                if response.status_code >= 400:
                    error_msg = f"HTTP {response.status_code}: {response.text}"
                    if attempt == self.max_retries:
                        raise ServiceClientError(error_msg)
                    else:
                        time.sleep(0.5 * (attempt + 1))
                        continue
                
                return response
                
            except requests.exceptions.RequestException as e:
                if attempt == self.max_retries:
                    raise ServiceClientError(f"请求失败: {str(e)}")
                else:
                    time.sleep(0.5 * (attempt + 1))
        
        raise ServiceClientError("达到最大重试次数")
    
    def add_phrase(self, template: str, category: str = "general", tags: List[str] = None, 
                   chat_title: str = "手动添加", source: str = "api") -> bool:
        """添加单条话术"""
        try:
            data = {
                "message": template,
                "chatTitle": chat_title,
                "source": source
            }
            
            response = self._make_request("POST", "ingest", json=data)
            result = response.json()
            
            return result.get("success", False)
            
        except Exception as e:
            logger.error(f"添加话术失败: {e}")
            return False
    
    def get_phrases(self, limit: int = 100, offset: int = 0, search: str = "") -> Dict[str, Any]:
        """获取话术列表"""
        try:
            params = {"limit": limit, "offset": offset}
            if search:
                params["search"] = search
            
            response = self._make_request("GET", "phrases", params=params)
            return response.json()
            
        except Exception as e:
            logger.error(f"获取话术列表失败: {e}")
            return {"phrases": [], "total": 0, "limit": limit, "offset": offset}
    
    def bulk_import(self, file_type: str, file_path: str) -> int:
        """
        通过文件上传实现高效的批量导入
        
        Args:
            file_type: 文件类型 (e.g., "json", "csv", "txt")
            file_path: 本地文件路径
            
        Returns:
            成功导入的话术数量
        """
        if not Path(file_path).exists():
            raise ServiceClientError(f"文件不存在: {file_path}")

        file_to_upload = None
        try:
            # Note: The server should have an endpoint like /import/upload to handle this
            file_to_upload = open(file_path, 'rb')
            files = {'file': (Path(file_path).name, file_to_upload, 'application/octet-stream')}
            params = {'file_type': file_type}
            
            response = self._make_request("POST", "import/upload", files=files, params=params)
            result = response.json()
            
            imported_count = result.get("imported_count", 0)
            if not result.get("success", False):
                error_details = result.get("error", "无详细错误信息")
                logger.warning(f"{file_type.upper()} 导入完成，但可能存在问题。导入: {imported_count}。详情: {error_details}")

            return imported_count
            
        except requests.exceptions.RequestException as e:
            raise ServiceClientError(f"文件上传请求失败: {e}")
        except json.JSONDecodeError:
            raise ServiceClientError("服务返回无效的JSON响应，请检查服务端点 /import/upload")
        except Exception as e:
            raise ServiceClientError(f"未知的文件上传错误: {e}")
        finally:
            if file_to_upload:
                file_to_upload.close()
    
    def get_stats(self) -> Dict[str, Any]:
        """获取话术库统计信息"""
        try:
            phrases_data = self.get_phrases(limit=1)
            total_phrases = phrases_data.get("total", 0)
            
            return {
                "total_phrases": total_phrases,
                "categories": {"general": total_phrases},
                "top_used": []
            }
            
        except Exception as e:
            return {"total_phrases": 0, "categories": {}, "top_used": []}
    
    def health_check(self) -> bool:
        """健康检查"""
        try:
            response = self._make_request("GET", "health")
            result = response.json()
            status = result.get("status", "").lower()
            return status in ["ok", "healthy", "up"]  # 兼容多种健康状态表示
        except Exception:
            return False
    
    def get_metrics(self) -> Dict[str, Any]:
        """获取服务指标"""
        try:
            response = self._make_request("GET", "metrics")
            return response.json()
        except Exception:
            return {}


def create_service_client(config_manager):
    """从配置管理器创建服务客户端工厂"""
    config = config_manager.load()
    app_config = config["app"]
    
    # 从HTTP API端点稳健地提取基础URL（排除WebSocket端点）
    http_endpoints = {k: v for k, v in app_config["api_endpoints"].items() 
                     if not v.startswith('ws://') and not v.startswith('wss://')}
    
    if not http_endpoints:
        raise ServiceClientError("配置中未找到有效的HTTP API端点")
    
    any_http_endpoint_url = next(iter(http_endpoints.values()))
    parsed_url = urlparse(any_http_endpoint_url)
    base_url = urlunparse((parsed_url.scheme, parsed_url.netloc, '', '', '', ''))
    
    return ServiceClient(
        base_url=base_url,
        timeout=app_config["security"].get("timeout", 10),
        max_retries=3
    )