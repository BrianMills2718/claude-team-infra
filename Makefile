## kb→course engine — standard targets

TARGET ?= /tmp/gen-instance
SPEC ?= /tmp/course-spec.json
LESSONS ?= /tmp/authored-lessons-grounded.json
LESSONS_RAW ?= /tmp/authored-lessons-workflow.json
QUIZZES_RAW ?= /tmp/authored-quizzes-12.json
QUIZZES ?= /tmp/authored-quizzes-12-normalized.json

.PHONY: help normalize validate-lessons validate-quizzes extract-lessons build check audit deploy

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-22s %s\n", $$1, $$2}'

normalize: ## Normalize raw workflow quiz output → frontend-ready format
	node scripts/normalize-quizzes.mjs $(QUIZZES_RAW) $(QUIZZES)

extract-lessons: ## Extract lesson workflow output → build-course format (preserves sources)
	node scripts/extract-lessons.mjs $(LESSONS_RAW) $(LESSONS)

validate-lessons: ## Validate raw lesson content: coverage, empty bodies, unverified claims
	node scripts/validate-lessons.mjs $(LESSONS_RAW) $(SPEC)

validate-quizzes: ## Validate normalized quizzes: bounds, types, sectionIndices
	node scripts/validate-quizzes.mjs $(QUIZZES) $(TARGET)/src/content/lessons/index.ts

build: ## Assemble the course instance (spec + lessons + quizzes → gen-instance)
	node scripts/build-course.mjs $(SPEC) $(TARGET) $(LESSONS) $(QUIZZES)

check: ## Full gate: build + tsc + content validators + vite build
	$(MAKE) build
	cd $(TARGET) && npm run check

audit: ## Run LLM audit of all stage content (requires workflow runner)
	@echo "Run: node scripts/audit-content.workflow.js" && \
	 echo "Then check: jq '[.[] | select(.overallQuality == \"needs-work\")] | length' <audit-output.json>"

deploy: validate-quizzes build check ## Validate → build → gate → deploy to gh-pages
	cd $(TARGET) && git add -A && git reset HEAD node_modules && \
	  git commit -m "deploy: $$(date '+%Y-%m-%d %H:%M') — quiz/lesson update" && \
	  git push origin HEAD:gh-pages --force
