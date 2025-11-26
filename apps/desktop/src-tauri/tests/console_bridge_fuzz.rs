use rand::{distributions::Alphanumeric, Rng};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct AutomationPayload {
    #[serde(rename = "eventType")]
    event_type: String,
    #[serde(default)]
    payload: serde_json::Value,
}

fn try_parse_payload(raw: &str) -> Result<AutomationPayload, serde_json::Error> {
    serde_json::from_str(raw)
}

#[test]
fn fuzz_console_bridge_payload_parser() {
    let mut rng = rand::thread_rng();

    // 多轮畸形载荷 + 随机合法载荷，确保解析不会崩溃
    for _ in 0..200 {
        let random_body: String = (0..rng.gen_range(0..48))
            .map(|_| rng.sample(Alphanumeric) as char)
            .collect();

        let payload = if rng.gen_bool(0.4) {
            // 构造半合法 JSON，可能缺字段或嵌套畸形
            format!(
                r#"{{"eventType":"{}", "payload": {{ "chat_id": "{}", "content": "{}"}}}}"#,
                random_body,
                rng.gen::<u64>(),
                random_body
            )
        } else {
            // 明显畸形输入
            random_body
        };

        let _ = try_parse_payload(&payload);
    }
}
