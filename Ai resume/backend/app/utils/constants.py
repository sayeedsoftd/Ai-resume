# Comprehensive Multi-Domain Skills Catalog (Tech, Design, Creative, Marketing, Management)
SKILLS_CATALOG = {
    "Languages": [
        "python", "javascript", "typescript", "java", "c++", "c#", "c programming", "c language", "go", "golang",
        "rust", "ruby", "php", "swift", "kotlin", "scala", "r", "dart", "sql", "bash",
        "shell", "powershell", "html", "html5", "css", "css3", "sass", "scss"
    ],
    "Frontend": [
        "react", "react.js", "next.js", "vue", "vue.js", "nuxt", "angular", "svelte",
        "redux", "zustand", "tailwind", "tailwindcss", "bootstrap", "material ui",
        "webpack", "vite", "babel", "jquery", "webgl", "three.js"
    ],
    "Backend & APIs": [
        "fastapi", "django", "flask", "node.js", "nodejs", "express", "express.js",
        "nestjs", "spring", "spring boot", "ruby on rails", "asp.net", ".net core",
        "graphql", "rest api", "restful", "grpc", "microservices", "celery", "websockets"
    ],
    "Databases & Caches": [
        "mysql", "postgresql", "postgres", "sqlite", "mongodb", "redis", "elasticsearch",
        "cassandra", "dynamodb", "mariadb", "firebase", "supabase", "couchdb", "neo4j",
        "clickhouse", "snowflake", "bigquery"
    ],
    "Cloud & DevOps": [
        "docker", "kubernetes", "k8s", "aws", "amazon web services", "azure", "gcp",
        "google cloud", "terraform", "ansible", "jenkins", "gitlab ci", "github actions",
        "circleci", "helm", "linux", "ubuntu", "nginx", "apache", "prometheus", "grafana"
    ],
    "AI, ML & NLP": [
        "machine learning", "deep learning", "nlp", "natural language processing",
        "computer vision", "llm", "large language models", "transformers", "pytorch",
        "tensorflow", "keras", "scikit-learn", "huggingface", "langchain", "llama-index",
        "pandas", "numpy", "scipy", "matplotlib", "seaborn", "opencv", "spacy", "nltk"
    ],
    "Design & Creative Tools": [
        "adobe photoshop", "photoshop", "adobe illustrator", "illustrator", "adobe indesign",
        "indesign", "in design", "adobe in design", "figma", "canva", "sketch", "adobe xd", "xd",
        "adobe lightroom", "lightroom", "adobe after effects", "after effects", "adobe premiere pro",
        "premiere pro", "coreldraw", "blender", "3ds max", "cinema 4d", "autocad", "invision"
    ],
    "Creative & Design Competencies": [
        "graphic design", "brand identity", "branding", "logo design", "packaging design",
        "packaging", "social media design", "social media post image", "print design",
        "typography", "color theory", "visual design", "vector illustration", "illustration",
        "photo retouching", "photo editing", "infographics", "layout design", "ui design",
        "ux design", "ui/ux", "wireframing", "prototyping", "creative direction",
        "digital illustration", "corporate branding", "visual identity", "creative designs"
    ],
    "Marketing & Media": [
        "digital marketing", "social media marketing", "seo", "content creation",
        "content marketing", "copywriting", "email marketing", "market research",
        "brand management", "advertising", "social media"
    ],
    "Testing & Quality": [
        "pytest", "unittest", "jest", "mocha", "cypress", "selenium", "playwright",
        "junit", "postman", "swagger", "sonarqube"
    ],
    "Methodologies & Professional": [
        "git", "github", "gitlab", "bitbucket", "jira", "agile", "scrum", "kanban",
        "ci/cd", "tdd", "system design", "software architecture", "code review",
        "leadership", "project management", "problem solving", "communication",
        "client communication", "time management", "remote collaboration", "attention to detail"
    ]
}

# Flattened list of lowercase skills for high-performance lookup
STANDARD_TECH_SKILLS = []
for skills_list in SKILLS_CATALOG.values():
    STANDARD_TECH_SKILLS.extend(skills_list)
STANDARD_TECH_SKILLS = sorted(list(set(STANDARD_TECH_SKILLS)), key=lambda s: len(s), reverse=True)

# Common aliases mapping for normalization
SKILL_ALIASES = {
    "k8s": "Kubernetes",
    "js": "JavaScript",
    "ts": "TypeScript",
    "py": "Python",
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "reactjs": "React",
    "react.js": "React",
    "vuejs": "Vue",
    "vue.js": "Vue",
    "nodejs": "Node.js",
    "node.js": "Node.js",
    "golang": "Go",
    "nextjs": "Next.js",
    "next.js": "Next.js",
    "tailwind": "Tailwind CSS",
    "tailwindcss": "Tailwind CSS",
    "aws": "AWS",
    "gcp": "GCP",
    "rest": "REST API",
    "restful": "REST API",
    "nlp": "NLP",
    "llm": "LLM",
    "ml": "Machine Learning",
    # Design & Creative Aliases
    "photoshop": "Adobe Photoshop",
    "adobe photoshop": "Adobe Photoshop",
    "illustrator": "Adobe Illustrator",
    "adobe illustrator": "Adobe Illustrator",
    "indesign": "Adobe InDesign",
    "adobe indesign": "Adobe InDesign",
    "in design": "Adobe InDesign",
    "adobe in design": "Adobe InDesign",
    "figma": "Figma",
    "canva": "Canva",
    "xd": "Adobe XD",
    "adobe xd": "Adobe XD",
    "lightroom": "Adobe Lightroom",
    "adobe lightroom": "Adobe Lightroom",
    "after effects": "Adobe After Effects",
    "adobe after effects": "Adobe After Effects",
    "premiere pro": "Adobe Premiere Pro",
    "adobe premiere pro": "Adobe Premiere Pro",
    "coreldraw": "CorelDraw",
    "graphic design": "Graphic Design",
    "logo design": "Logo Design",
    "brand identity": "Brand Identity",
    "branding": "Brand Identity",
    "visual identity": "Brand Identity",
    "corporate branding": "Brand Identity",
    "packaging design": "Packaging Design",
    "packaging": "Packaging Design",
    "social media design": "Social Media Design",
    "social media visuals": "Social Media Design",
    "social media post image": "Social Media Design",
    "print design": "Print Design",
    "typography": "Typography",
    "color theory": "Color Theory",
    "visual design": "Visual Design",
    "vector illustration": "Illustration",
    "illustration": "Illustration",
    "photo retouching": "Photo Retouching",
    "photo editing": "Photo Retouching",
    "infographics": "Infographics",
    "ui/ux": "UI/UX Design",
    "ui design": "UI Design",
    "ux design": "UX Design",
    "digital marketing": "Digital Marketing",
    "social media marketing": "Social Media Marketing",
    "client communication": "Client Communication",
    "time management": "Time Management",
    "remote collaboration": "Remote Collaboration",
    "attention to detail": "Attention to Detail",
}

# Recommended educational bridge resources when skills are missing
SKILL_LEARNING_RECOMMENDATIONS = {
    "docker": "Learn containerization basics: Dockerfile creation, multi-stage builds, and Docker Compose.",
    "kubernetes": "Study container orchestration: Pods, Deployments, Services, and Ingress routing.",
    "aws": "Familiarize with core cloud architectures: EC2, S3, RDS, Lambda, and IAM security.",
    "fastapi": "Master asynchronous REST APIs, dependency injection, and Pydantic validation.",
    "react": "Review React 18 hooks, context API, state management, and component lifecycles.",
    "graphql": "Explore GraphQL schema definitions, queries, mutations, and resolver patterns.",
    "redis": "Learn in-memory data structures, cache expiration strategies, and pub/sub patterns.",
    "postgresql": "Study advanced SQL, JSONB querying, indexing strategies (B-Tree, GIN), and query plans.",
    "machine learning": "Review supervised/unsupervised algorithms, cross-validation, and Scikit-Learn workflows.",
    "ci/cd": "Build automated testing and deployment pipelines using GitHub Actions or GitLab CI.",
    "microservices": "Explore service-to-service communication, event buses, resilience patterns, and API gateways.",
    "typescript": "Adopt strong static typing, interfaces, generics, and compiler configurations.",
    "adobe photoshop": "Master photo manipulation, masking, smart objects, and commercial digital imaging.",
    "adobe illustrator": "Learn vector illustration, pen tool mastery, typography, and logo branding systems.",
    "adobe indesign": "Study multi-page editorial layouts, prepress production, typography, and print standards.",
    "figma": "Familiarize with responsive auto-layout, design systems, interactive components, and prototyping.",
    "digital marketing": "Understand digital ad campaign structures, audience targeting, and content funnels.",
}

ALLOWED_RESUME_EXTENSIONS = {".pdf", ".docx", ".txt"}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
