# Deploying PaySplit frontend to Cloud Run

Every push to `develop` builds the Docker image with Cloud Build, pushes it to
Artifact Registry (`cloud-run-source-deploy`, `europe-west1`) and deploys it to
Cloud Run. Both the build and the service run as the project's **default
compute service account**.

```
push to develop ──▶ Cloud Build trigger ──▶ cloudbuild.yaml
                                             ├─ Build  (Dockerfile)
                                             ├─ Push   (Artifact Registry)
                                             └─ Deploy (gcloud run deploy)
```

| File | Purpose |
| --- | --- |
| `Dockerfile` | Two-stage Next.js standalone image, listens on `8080` |
| `.dockerignore` | Keeps the build context small (no `node_modules`, `.next`, `.env*`, designs) |
| `cloudbuild.yaml` | Build → push → deploy, driven by trigger substitutions |
| `lib/api.ts` | `API_BASE_URL` / `apiUrl()` / `apiFetch()` for future integrations |
| `.env.example` | Local copy target for `NEXT_PUBLIC_API_BASE_URL` |

## Branches

- `main`: production-ready code.
- `develop`: integration branch; **auto-deploys** to Cloud Run.
- `feature/*`, `chore/*`: open a PR into `develop`.

## One-time GCP setup

Run once per project. Requires the [gcloud CLI](https://cloud.google.com/sdk/docs/install)
and project Owner (or equivalent IAM admin) rights.

```bash
export PROJECT_ID=<your-gcp-project-id>
export REGION=europe-west1

gcloud auth login
gcloud config set project "$PROJECT_ID"

# APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com

# Artifact Registry repo (skip if cloud-run-source-deploy already exists)
gcloud artifacts repositories describe cloud-run-source-deploy --location="$REGION" \
  || gcloud artifacts repositories create cloud-run-source-deploy \
       --repository-format=docker --location="$REGION"

# Default compute service account: used by the trigger to build/deploy and by Cloud Run at runtime
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

for ROLE in roles/run.admin roles/artifactregistry.writer roles/logging.logWriter; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA" --role="$ROLE" --condition=None
done

# Lets the build deploy a service that runs as this same account
gcloud iam service-accounts add-iam-policy-binding "$SA" \
  --member="serviceAccount:$SA" --role=roles/iam.serviceAccountUser
```

## Create the trigger (console, recommended)

1. **Cloud Run → Deploy container → Service → "Continuously deploy from a repository"
   → Set up with Cloud Build.**
2. Connect GitHub and pick **`Future-Africa/paysplit-frontend`**.
3. **Branch:** `^develop$`. **Build type:** Dockerfile (we switch it to `cloudbuild.yaml` next).
4. **Service name:** `paysplit-frontend`. **Region:** `europe-west1`.
   **Authentication:** choose "Allow unauthenticated invocations" only if the site should be public.
5. **Container port:** `8080`. Create.
6. Open **Cloud Build → Triggers** and edit the new trigger:
   - **Configuration:** *Cloud Build configuration file*, location `/cloudbuild.yaml`.
   - **Service account:** the default compute service account (`…-compute@developer.gserviceaccount.com`).
   - **Substitution variables:** keep the ones the console added (`_AR_HOSTNAME`,
     `_AR_PROJECT_ID`, `_AR_REPOSITORY`, `_SERVICE_NAME`, `_DEPLOY_REGION`, `_PLATFORM`,
     `_TRIGGER_ID`) and **add `_API_BASE_URL`** (empty for now).
7. Save, then click **Run** on the trigger (or push to `develop`) to deploy.

## Create the trigger (CLI alternative)

Needs the Cloud Build GitHub App installed on the repo first (Cloud Build → Triggers →
Connect repository, one-time).

```bash
gcloud builds triggers create github \
  --name=paysplit-frontend-develop \
  --repo-owner=Future-Africa \
  --repo-name=paysplit-frontend \
  --branch-pattern='^develop$' \
  --build-config=cloudbuild.yaml \
  --service-account="projects/$PROJECT_ID/serviceAccounts/$SA" \
  --substitutions=_AR_HOSTNAME=europe-west1-docker.pkg.dev,_AR_PROJECT_ID=$PROJECT_ID,_AR_REPOSITORY=cloud-run-source-deploy,_SERVICE_NAME=paysplit-frontend,_DEPLOY_REGION=europe-west1,_PLATFORM=managed,_API_BASE_URL=
```

Builds only run from a trigger (`$REPO_NAME` and `$COMMIT_SHA` are empty in manual
`gcloud builds submit` runs, which breaks the image tag).

### Making the service public (only if intended)

The deploy step does not change access. To serve the site publicly:

```bash
gcloud run services add-iam-policy-binding paysplit-frontend --region="$REGION" \
  --member=allUsers --role=roles/run.invoker
```

(Some organisations block `allUsers` by policy; use a load balancer / IAP instead.)

## API base URL

- **Local:** `cp .env.example .env.local` and set `NEXT_PUBLIC_API_BASE_URL`.
- **Cloud Run:** set the trigger's `_API_BASE_URL` substitution (e.g.
  `https://api.example.com/api/v1`) and re-run the trigger. It is **baked in at
  build time**, so changing it always needs a new build, not just a new revision.
- **In code:** `import { apiFetch } from "@/lib/api"` then
  `apiFetch<Wallet[]>("/wallets")`.

## Building the image locally

```bash
docker build -t paysplit-frontend \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1 .
docker run --rm -p 8080:8080 paysplit-frontend   # http://localhost:8080
```

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `PERMISSION_DENIED` on Deploy | Re-run the IAM commands above (run.admin + serviceAccountUser). |
| Push fails with 403 | Service account is missing `roles/artifactregistry.writer`. |
| Image tag contains `//` or ends with `:` | The build was not started by a trigger; use the trigger. |
| API calls go to the wrong host | `_API_BASE_URL` changed without a rebuild; re-run the trigger. |
