"""配置加载集成测试（使用真实 YAML 样本）"""

from pathlib import Path

import pytest  # type: ignore[import-not-found]

from teleflow.config.loader import ConfigLoader

FIXTURE_DIR = Path(__file__).resolve().parents[1] / "fixtures" / "config_samples"


class TestConfigLoading:
    """针对 ConfigLoader 的最小正反向用例"""

    def setup_method(self):
        self.loader = ConfigLoader()

    def test_load_valid_config_sample(self):
        config_path = FIXTURE_DIR / "valid_config.yaml"
        config = self.loader.load_from_file(config_path)

        assert config.default_account == "primary"
        assert config.get_account("primary") is not None

    def test_missing_file_raises(self):
        with pytest.raises(FileNotFoundError):
            self.loader.load_from_file(FIXTURE_DIR / "missing.yaml")
