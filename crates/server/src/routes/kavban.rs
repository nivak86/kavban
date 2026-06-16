use axum::{Json, Router, response::Json as ResponseJson, routing::post};
use serde::{Deserialize, Serialize};
use utils::response::ApiResponse;
use uuid::Uuid;

use crate::{DeploymentImpl, error::ApiError};

#[derive(Debug, Deserialize)]
pub struct KavbanCodexIntakeRequest {
    #[serde(default)]
    project: Option<String>,
    title: String,
    description: String,
    #[serde(default, rename = "type", alias = "task_type")]
    task_type: Option<String>,
    #[serde(default)]
    priority: Option<String>,
    #[serde(default, alias = "suggestedAgent")]
    suggested_agent: Option<String>,
    #[serde(default, alias = "requiresHumanReview")]
    requires_human_review: Option<bool>,
    #[serde(default)]
    dependencies: Vec<String>,
    #[serde(default, alias = "context", alias = "contextTags")]
    context_tags: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct KavbanIntakeResponse {
    task_id: String,
    status: String,
    normalized: KavbanNormalizedTask,
}

#[derive(Debug, Serialize)]
pub struct KavbanNormalizedTask {
    id: String,
    project_id: String,
    title: String,
    description: String,
    #[serde(rename = "type")]
    task_type: String,
    priority: String,
    status: String,
    repo: KavbanTaskRepo,
    agent: KavbanTaskAgent,
    dependencies: Vec<String>,
    context_files: Vec<String>,
    execution: KavbanTaskExecution,
    review: KavbanTaskReview,
    created_from: KavbanTaskSource,
}

#[derive(Debug, Serialize)]
pub struct KavbanTaskRepo {
    provider: String,
    owner: String,
    name: String,
    default_branch: String,
    working_branch: String,
}

#[derive(Debug, Serialize)]
pub struct KavbanTaskAgent {
    assigned: String,
    fallback: String,
    reviewer: String,
}

#[derive(Debug, Serialize)]
pub struct KavbanTaskExecution {
    run_tests: bool,
    create_pr: bool,
    auto_merge: bool,
    requires_human_review: bool,
}

#[derive(Debug, Serialize)]
pub struct KavbanTaskReview {
    ai_review_required: bool,
    human_review_required: bool,
}

#[derive(Debug, Serialize)]
pub struct KavbanTaskSource {
    source: String,
    raw_input_id: String,
}

pub async fn create_kavban_intake(
    Json(payload): Json<KavbanCodexIntakeRequest>,
) -> Result<ResponseJson<ApiResponse<KavbanIntakeResponse>>, ApiError> {
    let response = normalize_intake(payload, "manual_intake")?;
    Ok(ResponseJson(ApiResponse::success(response)))
}

pub async fn create_codex_intake(
    Json(payload): Json<KavbanCodexIntakeRequest>,
) -> Result<ResponseJson<ApiResponse<KavbanIntakeResponse>>, ApiError> {
    let response = normalize_intake(payload, "codex_annotation")?;
    Ok(ResponseJson(ApiResponse::success(response)))
}

fn normalize_intake(
    payload: KavbanCodexIntakeRequest,
    source: &str,
) -> Result<KavbanIntakeResponse, ApiError> {
    let title = required_text(payload.title, "title")?;
    let description = required_text(payload.description, "description")?;
    let task_id = next_task_id();
    let task_type = normalize_task_type(payload.task_type.as_deref());
    let priority = normalize_priority(payload.priority.as_deref());
    let assigned_agent = normalize_agent(payload.suggested_agent.as_deref(), &task_type);
    let requires_human_review = payload.requires_human_review.unwrap_or(true);
    let dependencies = normalize_string_list(payload.dependencies);
    let context_tags = normalize_string_list(payload.context_tags);
    let project_id = payload
        .project
        .as_deref()
        .map(normalize_project_id)
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "kavban-core".to_string());
    let working_branch = format!("kav/{task_id}-{}", slugify(&title));

    let normalized = KavbanNormalizedTask {
        id: task_id.clone(),
        project_id,
        title,
        description,
        task_type,
        priority,
        status: "backlog".to_string(),
        repo: KavbanTaskRepo {
            provider: "github".to_string(),
            owner: "nivak86".to_string(),
            name: "kavban".to_string(),
            default_branch: "main".to_string(),
            working_branch,
        },
        agent: KavbanTaskAgent {
            assigned: assigned_agent,
            fallback: "codex".to_string(),
            reviewer: "reviewer".to_string(),
        },
        dependencies,
        context_files: context_files_for_tags(&context_tags),
        execution: KavbanTaskExecution {
            run_tests: true,
            create_pr: true,
            auto_merge: false,
            requires_human_review,
        },
        review: KavbanTaskReview {
            ai_review_required: true,
            human_review_required: requires_human_review,
        },
        created_from: KavbanTaskSource {
            source: source.to_string(),
            raw_input_id: format!("{source}-{}", Uuid::new_v4().simple()),
        },
    };

    Ok(KavbanIntakeResponse {
        task_id,
        status: "backlog".to_string(),
        normalized,
    })
}

fn required_text(value: String, field: &str) -> Result<String, ApiError> {
    let trimmed = value.trim();

    if trimmed.is_empty() {
        return Err(ApiError::BadRequest(format!("{field} is required")));
    }

    Ok(trimmed.to_string())
}

fn next_task_id() -> String {
    let token = Uuid::new_v4().simple().to_string();
    format!("kav-{}", &token[..8])
}

fn normalize_project_id(value: &str) -> String {
    slugify(value)
}

fn normalize_task_type(value: Option<&str>) -> String {
    match value.map(|item| item.trim().to_lowercase()).as_deref() {
        Some("bug") => "bug",
        Some("chore") => "chore",
        Some("docs") | Some("documentation") => "docs",
        Some("feature") => "feature",
        Some("refactor") => "refactor",
        Some("test") | Some("tests") => "tests",
        _ => "task",
    }
    .to_string()
}

fn normalize_priority(value: Option<&str>) -> String {
    match value.map(|item| item.trim().to_lowercase()).as_deref() {
        Some("high") => "high",
        Some("low") => "low",
        Some("medium") => "medium",
        _ => "medium",
    }
    .to_string()
}

fn normalize_agent(value: Option<&str>, task_type: &str) -> String {
    match value.map(|item| item.trim().to_lowercase()).as_deref() {
        Some("claude") | Some("claude-code") | Some("claude_code") => "claude",
        Some("codex") => "codex",
        Some("gemini") => "gemini",
        Some("reviewer") => "reviewer",
        _ if matches!(task_type, "feature" | "docs" | "refactor") => "claude",
        _ => "codex",
    }
    .to_string()
}

fn normalize_string_list(values: Vec<String>) -> Vec<String> {
    values
        .into_iter()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .fold(Vec::new(), |mut list, value| {
            if !list.contains(&value) {
                list.push(value);
            }
            list
        })
}

fn context_files_for_tags(tags: &[String]) -> Vec<String> {
    let mut files = vec![
        "kavban.project.md".to_string(),
        "architecture.md".to_string(),
        "coding-rules.md".to_string(),
        "current-state.md".to_string(),
        "known-issues.md".to_string(),
        "review-checklist.md".to_string(),
    ];

    if tags.iter().any(|tag| tag.eq_ignore_ascii_case("connections")) {
        files.push("connections.md".to_string());
    }

    if tags.iter().any(|tag| {
        matches!(
            tag.to_lowercase().as_str(),
            "agent" | "agents" | "worker" | "workers" | "routing"
        )
    }) {
        files.push("agent-rules.md".to_string());
    }

    files
}

fn slugify(value: &str) -> String {
    let mut slug = String::new();
    let mut previous_dash = false;

    for character in value.chars().flat_map(char::to_lowercase) {
        if character.is_ascii_alphanumeric() {
            slug.push(character);
            previous_dash = false;
        } else if !previous_dash && !slug.is_empty() {
            slug.push('-');
            previous_dash = true;
        }
    }

    slug.trim_end_matches('-').to_string()
}

pub fn router() -> Router<DeploymentImpl> {
    Router::new()
        .route("/kavban/intake", post(create_kavban_intake))
        .route("/kavban/intake/codex", post(create_codex_intake))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_codex_annotation_payload() {
        let response = normalize_intake(
            KavbanCodexIntakeRequest {
                project: Some("Rocky App".to_string()),
                title: " Add daily health summary widget ".to_string(),
                description: "Show sleep, glucose, food, and workout status.".to_string(),
                task_type: Some("feature".to_string()),
                priority: Some("high".to_string()),
                suggested_agent: Some("claude".to_string()),
                requires_human_review: Some(true),
                dependencies: vec!["KAV-100".to_string(), "KAV-100".to_string()],
                context_tags: vec!["dashboard".to_string(), "agents".to_string()],
            },
            "codex_annotation",
        )
        .expect("payload should normalize");

        assert!(response.task_id.starts_with("kav-"));
        assert_eq!(response.status, "backlog");
        assert_eq!(response.normalized.project_id, "rocky-app");
        assert_eq!(response.normalized.priority, "high");
        assert_eq!(response.normalized.agent.assigned, "claude");
        assert_eq!(response.normalized.dependencies, vec!["KAV-100"]);
        assert!(
            response
                .normalized
                .context_files
                .contains(&"agent-rules.md".to_string())
        );
        assert_eq!(response.normalized.review.human_review_required, true);
    }

    #[test]
    fn rejects_missing_required_fields() {
        let result = normalize_intake(
            KavbanCodexIntakeRequest {
                project: None,
                title: " ".to_string(),
                description: "Details".to_string(),
                task_type: None,
                priority: None,
                suggested_agent: None,
                requires_human_review: None,
                dependencies: vec![],
                context_tags: vec![],
            },
            "codex_annotation",
        );

        assert!(result.is_err());
    }
}
