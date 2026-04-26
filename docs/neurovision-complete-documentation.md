# NeuroVision — Complete Project Documentation

> A full-stack neurological screening platform that detects Parkinson's Disease and screens for Alzheimer's, Multiple Sclerosis, and Huntington's Disease using eye-tracking gaze analysis powered by a Bidirectional LSTM neural network.

---

## Table of Contents

1. [Project Architecture](#1-project-architecture)
2. [Frontend — React + TypeScript](#2-frontend--react--typescript)
3. [Backend — FastAPI + Python](#3-backend--fastapi--python)
4. [Database Layer](#4-database-layer)
5. [Authentication System](#5-authentication-system)
6. [ML Model Architecture — BiLSTM](#6-ml-model-architecture--bilstm)
7. [Training Pipeline](#7-training-pipeline)
8. [Data Preprocessing & Feature Engineering](#8-data-preprocessing--feature-engineering)
9. [Data Augmentation](#9-data-augmentation)
10. [Inference Pipeline](#10-inference-pipeline)
11. [Video Processing — MediaPipe](#11-video-processing--mediapipe)
12. [Multi-Condition Risk Scoring](#12-multi-condition-risk-scoring)
13. [Risk Stratification](#13-risk-stratification)
14. [Real-Time WebSocket Streaming](#14-real-time-websocket-streaming)
15. [Deployment & Docker](#15-deployment--docker)
16. [All Equations Reference](#16-all-equations-reference)
17. [Key Files Reference](#17-key-files-reference)

---

## 1. Project Architecture

```
neurovision/
├── frontend/                    # React 19 + Vite + TypeScript
│   ├── src/
│   │   ├── pages/               # 5 route pages
│   │   ├── components/          # UI components (common, home, analysis)
│   │   ├── hooks/               # useAnalysis, useProgress
│   │   ├── context/             # AuthContext (JWT state)
│   │   ├── services/            # Axios API client
│   │   └── types/               # TypeScript type definitions
│   ├── Dockerfile               # Multi-stage: Node build → Nginx
│   └── nginx.conf               # SPA routing + gzip
├── backend/                     # FastAPI + PyTorch
│   ├── app/
│   │   ├── main.py              # App entry, lifespan, CORS, routers
│   │   ├── config.py            # Pydantic Settings
│   │   ├── api/routes/          # health, auth, analysis endpoints
│   │   ├── db/                  # SQLAlchemy async engine
│   │   ├── models/              # ORM models + Pydantic schemas
│   │   └── services/ml/         # Model def, inference, video processing
│   ├── ml/
│   │   ├── models/              # Trained weights (.pt) + metadata (.json)
│   │   └── training/            # Modal.com GPU training scripts
│   ├── Dockerfile               # Python 3.10 + system deps
│   └── requirements.txt
├── docker-compose.yml           # Orchestrates backend + frontend
└── neurovision_1.ipynb          # Jupyter notebook (prototyping)
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 19.2.4 + TypeScript 5.9.3 |
| Build Tool | Vite 8.0.0 |
| UI Library | HeroUI (Heroui/react 2.8.10) |
| Styling | Tailwind CSS 3.4.19 (dark theme) |
| Charts | Recharts 3.8.0 |
| Animations | Framer Motion 12.36.0 |
| Icons | Lucide React 0.577.0 |
| Client-side ML | MediaPipe Tasks Vision 0.10.34 |
| HTTP Client | Axios 1.13.6 |
| Data Fetching | TanStack React Query 5.90.21 |
| Backend Framework | FastAPI 0.115.6 |
| ASGI Server | Uvicorn 0.34.0 |
| Database | SQLite + SQLAlchemy 2.0.36 (async) |
| ML Framework | PyTorch 2.5.1 |
| Computer Vision | OpenCV 4.10+ (headless) |
| Face Landmarks | MediaPipe 0.10.14 |
| Auth | JWT (python-jose) + bcrypt |
| Training Infra | Modal.com (T4 GPU) |

---

## 2. Frontend — React + TypeScript

### 2.1 Pages & Routing

| Route | Page | Description |
|---|---|---|
| `/` | Home | Hero banner, file upload cards, webcam capture |
| `/login` | Login | Email/password authentication |
| `/register` | Register | User registration with validation |
| `/analysis/:sessionId` | Analysis | Real-time processing view + results dashboard |
| `/history` | History | Session list (authenticated users) |

### 2.2 Component Hierarchy

```
App.tsx
├── Navbar.tsx                 # Fixed nav, auth dropdown, glass morphism
├── <Routes>
│   ├── Home.tsx
│   │   ├── HeroBanner.tsx     # Animated iris SVG, word carousel, stats
│   │   ├── UploadCard.tsx     # Drag-and-drop file upload (data or video)
│   │   └── WebcamCapture.tsx  # Live MediaPipe iris tracking + recording
│   ├── Login.tsx              # Email/password form with Framer Motion
│   ├── Register.tsx           # Registration with password validation
│   ├── Analysis.tsx
│   │   ├── LiveAnalysis.tsx   # Terminal logs, progress bar, live chart
│   │   ├── RiskGauge.tsx      # Radial bar chart with ambient glow
│   │   ├── RiskExplanation.tsx # Window probability breakdown
│   │   └── ConditionScores.tsx # 4-condition screening cards
│   └── History.tsx
│       └── SessionCard.tsx    # Session list item with risk badge
└── Footer.tsx                 # Tech badges, disclaimer
```

### 2.3 State Management

- **AuthContext** (React Context API): Manages `user`, `token`, `isLoading` with `login()`, `register()`, `logout()`. Persists JWT in `localStorage` (`nv_token`, `nv_user`).
- **TanStack React Query**: Server state via `useSession()` (2s polling while processing), `useSessions()` (30s stale time), `useDataUpload()`, `useVideoUpload()`.
- **useProgress hook**: WebSocket connection for real-time analysis progress streaming.

### 2.4 API Client (`services/api.ts`)

```typescript
// Axios instance
baseURL: `${VITE_API_URL}/api`
timeout: 300000ms (5 minutes)
// JWT auto-injected via interceptor from localStorage

// Endpoints
POST /auth/login          // OAuth2 form-encoded
POST /auth/register       // JSON body
POST /analyze/data        // Multipart file upload
POST /analyze/video       // Multipart file upload
GET  /sessions            // List sessions
GET  /sessions/{id}       // Session detail

// WebSocket
WS /ws/analysis/{id}      // Real-time progress
```

### 2.5 Theme & Styling

**Always dark mode** — forced via Tailwind `darkMode: "class"` + HeroUI `defaultTheme: "dark"`.

| Token | Color | Usage |
|---|---|---|
| `neuro-black` | `#07090e` | Page background |
| `neuro-dark` | `#0d1018` | Section backgrounds |
| `neuro-card` | `#131620` | Card surfaces |
| `neuro-blue` | `#3b82f6` | Primary accent |
| `neuro-purple` | `#8b5cf6` | Secondary accent |
| `neuro-green` | `#10b981` | Low risk / success |
| `neuro-amber` | `#f59e0b` | Moderate risk / warning |
| `neuro-red` | `#ef4444` | High risk / error |

**Custom fonts**: Figtree (sans), Syne (display), DM Mono (monospace).

### 2.6 Animations & Visual Effects

- **Framer Motion**: Page transitions, staggered lists, spring-physics gauges, hover animations
- **Custom CSS**: Orb drift backgrounds, iris scan rotation, risk pulse glows (red/amber/green), terminal cursor blink, CRT scanline overlay, progress bar shimmer, eye blink animation
- **SVG Animations**: Rotating scan arm, pulsing rings, compass labels, crosshair movement, blinking center dot

### 2.7 Webcam Capture (WebcamCapture.tsx)

- Uses **MediaPipe FaceLandmarker** (GPU-accelerated) in the browser
- Tracks iris landmarks: Left iris [468-472], Right iris [473-477]
- Real-time canvas overlay visualizing iris positions
- 30-second recording limit with countdown timer
- Records as `.webm`, uploads via video analysis endpoint
- Handles camera permissions, face detection status badges

### 2.8 Visualizations

| Component | Library | Type |
|---|---|---|
| Risk Gauge | Recharts `RadialBarChart` | Circular gauge with glow |
| Window Probabilities | Recharts `BarChart` | Color-coded bars (green/amber/red) |
| Live Inference | Recharts `BarChart` | Real-time updating during processing |
| Condition Scores | Custom CSS | Animated progress bars with labels |

---

## 3. Backend — FastAPI + Python

### 3.1 Application Setup (`app/main.py`)

```python
# Lifespan context manager
async def lifespan(app):
    # STARTUP
    await init_db()           # Create tables, run migrations
    load_model(MODEL_PATH)    # Load BiLSTM weights
    yield
    # SHUTDOWN
    await close_db()

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, ...)
app.include_router(health_router)
app.include_router(analysis_router)
app.include_router(auth_router)
app.add_api_websocket_route("/ws/analysis/{session_id}", websocket_handler)
```

### 3.2 API Endpoints

#### Health
| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Returns `{status, service, model_loaded}` |

#### Authentication (`/api/auth`)
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account (email, password >= 8 chars) |
| `POST` | `/api/auth/login` | OAuth2 password flow → JWT token |
| `GET` | `/api/auth/me` | Get current user from Bearer token |

#### Analysis (`/api`)
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/analyze/data` | Upload `.txt`/`.csv`/`.tsv` eye-tracking file |
| `POST` | `/api/analyze/video` | Upload `.mp4`/`.avi`/`.mov`/`.mkv`/`.webm` video |
| `GET` | `/api/sessions` | List sessions (filtered by auth state) |
| `GET` | `/api/sessions/{id}` | Get session detail + analysis result |

#### WebSocket
| Protocol | Path | Description |
|---|---|---|
| `WS` | `/ws/analysis/{session_id}` | Real-time progress streaming |

### 3.3 Configuration (`app/config.py`)

```python
class Settings(BaseSettings):
    DATABASE_URL    = "sqlite+aiosqlite:///./neurovision.db"
    MODEL_PATH      = "ml/models/neurovision_bilstm.pt"
    CORS_ORIGINS    = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:18501"]
    MAX_UPLOAD_MB   = 200
    SECRET_KEY      = "change-me-in-production..."
    JWT_EXPIRE_DAYS = 7
```

### 3.4 Background Task Processing

File uploads trigger `asyncio.create_task()` for fire-and-forget processing:

**Data File Pipeline** (`_run_data_analysis`):
```
Parse (5-15%) → Normalize (20-28%) → Windows (32-40%) → Inference (50-78%) → Aggregate (82-88%) → Save (92-100%)
```

**Video Pipeline** (`_run_video_analysis`):
```
Thumbnail (2%) → MediaPipe Extract (5-38%) → Normalize (40%) → Windows (42-50%) → Inference (55-80%) → Aggregate (85-90%) → Save (94-100%)
```

Each stage broadcasts progress via WebSocket. Errors update `session.status = "error"` and broadcast error messages. Temp files are cleaned up in `finally` blocks.

---

## 4. Database Layer

### 4.1 Engine

- **ORM**: SQLAlchemy 2.0.36 (async mode)
- **Driver**: aiosqlite 0.20.0
- **Database**: SQLite (`neurovision.db`)
- **Migrations**: Idempotent `ALTER TABLE` in `_run_migrations()` (adds columns if missing)

### 4.2 Schema

```
┌──────────────────┐     ┌──────────────────────┐     ┌─────────────────────────┐
│      User        │     │       Session         │     │    AnalysisResult       │
├──────────────────┤     ├──────────────────────┤     ├─────────────────────────┤
│ id (UUID, PK)    │←──┐ │ id (UUID, PK)        │←──┐ │ id (INT, PK, auto)     │
│ email (unique)   │   └─│ user_id (FK, null)   │   └─│ session_id (FK, unique)│
│ password_hash    │     │ input_type           │     │ risk_score (float)     │
│ created_at       │     │ filename             │     │ risk_level (str)       │
│                  │     │ status               │     │ recommendation (str)   │
│                  │     │ error_message (null)  │     │ num_windows (int)      │
│                  │     │ thumbnail (null)      │     │ window_probs (JSON)    │
│                  │     │ created_at            │     │ condition_scores (JSON)│
│                  │     │                      │     │ analyzed_at            │
└──────────────────┘     └──────────────────────┘     └─────────────────────────┘
```

**Session statuses**: `pending` → `processing` → `complete` | `error`

**Session filtering**: Authenticated users see only their sessions; anonymous users see only sessions with `user_id = NULL`.

---

## 5. Authentication System

| Property | Value |
|---|---|
| Strategy | Stateless JWT (JSON Web Tokens) |
| Algorithm | HS256 |
| Token Lifetime | 7 days |
| Password Hashing | bcrypt (salted) |
| Transport | `Authorization: Bearer <token>` header |
| Client Storage | `localStorage` (`nv_token`, `nv_user`) |

**JWT Payload**:
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "exp": 1711900800
}
```

**Auth Flow**:
1. User submits email/password → `POST /api/auth/login`
2. Backend verifies bcrypt hash → generates JWT
3. Frontend stores token in `localStorage`
4. Axios interceptor attaches `Bearer` token to all requests
5. Backend `get_optional_user()` dependency resolves JWT → User or None
6. Anonymous analysis is supported (no auth required for uploads)

---

## 6. ML Model Architecture — BiLSTM

### 6.1 Architecture Diagram

```
Input: (batch, 300, 4)
         │
         ▼
┌─────────────────────────────────────────┐
│         Bidirectional LSTM              │
│   ┌───────────┐    ┌───────────┐       │
│   │  Forward   │    │  Backward  │      │
│   │  LSTM      │    │  LSTM      │      │
│   │  Layer 1   │    │  Layer 1   │      │
│   │  h=128     │    │  h=128     │      │
│   └─────┬─────┘    └─────┬─────┘       │
│         │                │              │
│   ┌─────┴─────┐    ┌─────┴─────┐       │
│   │  Forward   │    │  Backward  │      │
│   │  LSTM      │    │  LSTM      │      │
│   │  Layer 2   │    │  Layer 2   │      │
│   │  h=128     │    │  h=128     │      │
│   └─────┬─────┘    └─────┬─────┘       │
│         │                │              │
│         └───────┬────────┘              │
│                 │ concat                │
│         [h_fwd || h_bwd]               │
│              (256)                       │
│         dropout=0.3                     │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│           Classifier (Sequential)       │
│                                         │
│   Linear(256 → 128)                    │
│         │                               │
│       ReLU                              │
│         │                               │
│   Dropout(0.3)                          │
│         │                               │
│   Linear(128 → 2)                      │
│         │                               │
│     Softmax                             │
│    [P(control), P(parkinson's)]         │
└─────────────────────────────────────────┘

Output: (batch, 2) → class probabilities
```

### 6.2 Model Specifications

| Parameter | Value |
|---|---|
| Input Size | 4 (left X/Y, right X/Y gaze coordinates) |
| Sequence Length | 300 frames |
| LSTM Hidden Size | 128 |
| LSTM Layers | 2 |
| Bidirectional | Yes (output = 256) |
| LSTM Dropout | 0.3 |
| Classifier | 256 → 128 → ReLU → Dropout(0.3) → 2 |
| Output Classes | 2 (Control=0, Parkinson's=1) |
| Total Parameters | ~130,000+ |
| Weights File Size | 2.2 MB |
| Best Test Accuracy | 81.15% |

### 6.3 LSTM Cell Equations (per timestep t)

The LSTM processes each timestep through gating mechanisms:

**Forget gate** — decides what to discard from cell state:

$$f_t = \sigma(W_f [h_{t-1}, x_t] + b_f)$$

**Input gate** — decides what new information to store:

$$i_t = \sigma(W_i [h_{t-1}, x_t] + b_i)$$

**Candidate cell state** — creates candidate values:

$$\tilde{C}_t = \tanh(W_C [h_{t-1}, x_t] + b_C)$$

**Cell state update** — combines old state and new candidates:

$$C_t = f_t \odot C_{t-1} + i_t \odot \tilde{C}_t$$

**Output gate** — decides what to output:

$$o_t = \sigma(W_o [h_{t-1}, x_t] + b_o)$$

**Hidden state** — filtered cell state as output:

$$h_t = o_t \odot \tanh(C_t)$$

Where:
- $\sigma$ = sigmoid activation function
- $\odot$ = element-wise (Hadamard) product
- $[h_{t-1}, x_t]$ = concatenation of previous hidden state and current input

### 6.4 Bidirectional Concatenation

The BiLSTM runs two independent LSTMs — one processes the sequence forward (t=1→T), the other backward (t=T→1). Their final hidden states are concatenated:

$$h_{\text{final}} = [\overrightarrow{h_T} \| \overleftarrow{h_1}] \in \mathbb{R}^{256}$$

This captures both past and future temporal context in the gaze sequence.

### 6.5 Classification Layer

The concatenated hidden state passes through a fully-connected classifier:

$$z = W_2 \cdot \text{ReLU}(W_1 \cdot h_{\text{final}} + b_1) + b_2$$

$$P(\text{class}_c) = \text{softmax}(z)_c = \frac{e^{z_c}}{\sum_{j} e^{z_j}}$$

---

## 7. Training Pipeline

### 7.1 Infrastructure

| Property | Value |
|---|---|
| Platform | Modal.com (serverless GPU) |
| GPU | NVIDIA Tesla T4 |
| Container | Python 3.11 + PyTorch 2.5.1 |
| Script | `backend/ml/training/modal_train_bilstm.py` |
| Volume | `neurovision-models` (persists weights) |

### 7.2 Dataset

- **Source**: Eye-tracking data files (Tobii/EyeLink format)
- **Example**: `OH01_April_14_2022 - Raw Data.txt` (80,410 rows × 40 columns)
- **Features extracted**: 4 gaze columns (left X/Y, right X/Y in pixels)
- **Labeling**: Participant name containing "Sham" = Control (0), otherwise = Parkinson's (1)
- **After windowing**: 607 samples (382 control, 225 Parkinson's)
- **Train/Test split**: 80/20 stratified (random_state=42)

### 7.3 Training Hyperparameters

| Hyperparameter | Value |
|---|---|
| Batch Size (train) | 32 |
| Batch Size (test) | 64 |
| Epochs | 50 (max) |
| Learning Rate | 1e-3 |
| Weight Decay | 1e-4 |
| Optimizer | AdamW |
| Loss Function | CrossEntropyLoss |
| LR Scheduler | ReduceLROnPlateau (patience=2, factor=0.5) |
| Gradient Clipping | max_norm = 1.0 |
| Early Stopping | patience = 8 epochs |

### 7.4 Loss Function — Cross-Entropy

$$\mathcal{L} = -\sum_{c=1}^{C} y_c \log(\hat{y}_c)$$

Where $C=2$ (Control, Parkinson's), $y$ is the one-hot true label, $\hat{y}$ is the softmax output.

### 7.5 Optimizer — AdamW

AdamW decouples weight decay from the gradient-based update:

**First moment estimate (mean):**
$$m_t = \beta_1 m_{t-1} + (1 - \beta_1) g_t$$

**Second moment estimate (variance):**
$$v_t = \beta_2 v_{t-1} + (1 - \beta_2) g_t^2$$

**Bias-corrected estimates:**
$$\hat{m}_t = \frac{m_t}{1 - \beta_1^t}, \quad \hat{v}_t = \frac{v_t}{1 - \beta_2^t}$$

**Parameter update (decoupled weight decay):**
$$\theta_{t+1} = \theta_t - \eta \left( \frac{\hat{m}_t}{\sqrt{\hat{v}_t} + \epsilon} + \lambda \theta_t \right)$$

Where $\eta = 10^{-3}$, $\lambda = 10^{-4}$, $\beta_1 = 0.9$, $\beta_2 = 0.999$, $\epsilon = 10^{-8}$.

### 7.6 Learning Rate Scheduler — ReduceLROnPlateau

$$\eta_{\text{new}} = \eta_{\text{old}} \times 0.5 \quad \text{if no improvement for 2 consecutive epochs}$$

Monitors validation loss. Reduces learning rate by half when training plateaus.

### 7.7 Gradient Clipping

$$\text{if } \|\nabla\theta\|_2 > 1.0: \quad \nabla\theta \leftarrow \frac{\nabla\theta}{\|\nabla\theta\|_2}$$

Prevents exploding gradients common in deep LSTM networks.

### 7.8 Early Stopping

Training halts when test accuracy fails to improve for **8 consecutive epochs**. The model with the best test accuracy is saved.

### 7.9 Training Convergence

From the Jupyter notebook (25 epochs):
- **Epoch 1**: Loss ~10.56, Test Acc ~65%
- **Epoch 10**: Loss ~7.8, Test Acc ~78%
- **Epoch 25**: Loss ~6.55, Test Acc ~89.3%
- **Best (Modal training)**: Test Acc = **81.15%**

---

## 8. Data Preprocessing & Feature Engineering

### 8.1 Raw Input Features

| Column | Description | Unit |
|---|---|---|
| Point of Regard Left X | Left eye horizontal gaze position | pixels |
| Point of Regard Left Y | Left eye vertical gaze position | pixels |
| Point of Regard Right X | Right eye horizontal gaze position | pixels |
| Point of Regard Right Y | Right eye vertical gaze position | pixels |

### 8.2 Parsing

- Reads tab-separated eye-tracker output files
- Handles missing value markers: `"-"`, `"NA"`, `"#N/A"`, `"N/A"`
- Drops rows where any of the 4 gaze columns are NaN
- Returns `(N, 4)` float32 array

### 8.3 Min-Max Normalization

Each column is independently scaled to [0, 1]:

$$x_{\text{norm}} = \frac{x - x_{\min}}{x_{\max} - x_{\min}}$$

Zero-range columns (constant values) default to 1.0 to prevent division by zero.

### 8.4 Sliding Windows

Temporal sequences are segmented into overlapping windows:

$$W = \left\lfloor \frac{N - \text{window\_size}}{\text{stride}} \right\rfloor + 1$$

| Parameter | Value |
|---|---|
| Window size | 300 frames (~10 seconds at 30 fps) |
| Stride | 100 frames (67% overlap) |
| Output shape | `(W, 300, 4)` |
| Minimum data | >300 frames required |

### 8.5 Derived Features (for condition scoring)

**Gaze speed** (frame-to-frame displacement):

$$s_{\text{left},t} = \sqrt{(\Delta x_L)^2 + (\Delta y_L)^2}, \quad s_{\text{right},t} = \sqrt{(\Delta x_R)^2 + (\Delta y_R)^2}$$

$$s_t = \frac{s_{\text{left},t} + s_{\text{right},t}}{2}$$

**Speed statistics**:
- Mean: $\mu_s = \frac{1}{N}\sum s_t$
- Standard deviation: $\sigma_s = \sqrt{\frac{1}{N}\sum(s_t - \mu_s)^2}$
- Coefficient of variation: $\text{CV} = \sigma_s / \mu_s$

**Binocular coordination**:
- Pearson correlation $r$ between $s_{\text{left}}$ and $s_{\text{right}}$

---

## 9. Data Augmentation

Applied **online** per training batch to improve generalization. Each augmentation is applied independently with its own probability.

### 9.1 Gaussian Noise (85% probability)

Simulates measurement jitter from eye-tracker hardware:

$$x' = x + \mathcal{N}(0, \sigma^2), \quad \sigma \sim U(0.005, 0.04)$$

### 9.2 Global DC Shift (60% probability)

Simulates different fixation baselines between subjects:

$$x' = x + \delta, \quad \delta \sim U(-0.15, 0.15)$$

### 9.3 Amplitude Scaling (60% probability)

Adapts to different gaze movement amplitudes, scaling around the window mean:

$$x' = \bar{x} + s(x - \bar{x}), \quad s \sim U(0.65, 1.35)$$

### 9.4 Narrow-Range Remap (35% probability)

Simulates MediaPipe iris position ranges (~30-70% of face width) for video→file domain adaptation:

$$x' \in [c - h, \; c + h], \quad c \sim U(0.35, 0.65), \; h \sim U(0.12, 0.22)$$

Linearly remaps each channel's [min, max] to the new target range.

---

## 10. Inference Pipeline

### 10.1 Data File Inference Flow

```
Eye-tracking file (.txt/.csv/.tsv)
    │
    ▼
┌─ parse_eye_tracking_file() ─┐
│  Read TSV, handle NA values  │
│  Extract 4 gaze columns     │
│  Drop NaN rows               │
│  Output: (N, 4) float32     │
└──────────────┬───────────────┘
               ▼
┌─ normalize() ────────────────┐
│  Min-max scale per column    │
│  Range: [0, 1]               │
└──────────────┬───────────────┘
               ▼
┌─ sliding_windows() ─────────┐
│  Window: 300, Stride: 100   │
│  Output: (W, 300, 4)        │
└──────────────┬───────────────┘
               ▼
┌─ run_inference_batch() ──────┐
│  Convert to PyTorch tensor   │
│  model(tensor) → logits     │
│  softmax → P(parkinson's)   │
│  Output: list[float]         │
└──────────────┬───────────────┘
               ▼
┌─ stratify_risk() ───────────┐
│  risk_score = mean(probs)    │
│  Classify: LOW/MODERATE/HIGH │
└──────────────┬───────────────┘
               ▼
┌─ compute_condition_scores() ─┐
│  Parkinson's: from BiLSTM    │
│  Alzheimer's: CV heuristic   │
│  MS: binocular correlation   │
│  Huntington's: intrusion rate│
└──────────────┬───────────────┘
               ▼
         Save to DB +
     Broadcast via WebSocket
```

### 10.2 Batch Size Strategy

```python
BATCH = max(1, min(10, n_windows // 6))
```

Dynamically adapts to number of windows. Processes in batches for efficiency while streaming per-batch progress updates via WebSocket.

### 10.3 Fallback Inference

If the model fails to load, the system returns synthetic probabilities for graceful degradation:

```python
probs = [0.3 + 0.1 * sin(i) for i in range(n_windows)]
```

---

## 11. Video Processing — MediaPipe

### 11.1 MediaPipe FaceLandmarker Configuration

| Parameter | Value |
|---|---|
| Model | `face_landmarker.task` (float16) |
| Running Mode | VIDEO (per-frame) |
| Min Face Detection Confidence | 0.3 |
| Min Face Presence Confidence | 0.3 |
| Min Tracking Confidence | 0.3 |
| Max Faces | 1 |
| Left Iris Index | 468 (center) |
| Right Iris Index | 473 (center) |

### 11.2 Video-to-Gaze Pipeline

```
Video file (.mp4/.avi/.mov/.mkv/.webm)
    │
    ▼
┌─ OpenCV VideoCapture ───────┐
│  Extract FPS, frame count    │
└──────────────┬───────────────┘
               ▼
┌─ Per-Frame Processing ──────┐
│  BGR → RGB conversion       │
│  MediaPipe landmark detect  │
│  Extract iris (468, 473)     │
│  Normalized coords [0, 1]   │
│  Output: [lx, ly, rx, ry]   │
└──────────────┬───────────────┘
               ▼
┌─ Moving Average Smoothing ──┐
│  Window k = 9 (centered)    │
│  Reduces MediaPipe jitter   │
└──────────────┬───────────────┘
               ▼
      (N, 4) gaze array
    → same pipeline as data files
```

### 11.3 Smoothing Equation

$$\bar{x}_t = \frac{1}{k} \sum_{i=-(k-1)/2}^{(k-1)/2} x_{t+i}, \quad k = 9$$

Uses pandas rolling window with `center=True, min_periods=1`. Reduces jitter from MediaPipe iris estimation.

### 11.4 Thumbnail Extraction

- Seeks to **10%** through the video (avoids initial black frames)
- Resizes to max width 480px
- Encodes as JPEG (quality=75)
- Stores as base64 string in the Session record

### 11.5 Browser-Side Webcam (WebcamCapture.tsx)

The frontend also uses MediaPipe FaceLandmarker for **live iris tracking**:
- GPU-accelerated in-browser processing
- Canvas overlay renders iris positions in real-time
- Records up to 30 seconds of webcam video as `.webm`
- Uploaded via the video analysis endpoint

---

## 12. Multi-Condition Risk Scoring

Only **Parkinson's Disease** uses the trained BiLSTM model. The remaining three conditions use **feature-based heuristics** derived from clinical gaze biomarkers.

### 12.1 Parkinson's Disease — BiLSTM Model

$$\text{PD score} = \frac{1}{W} \sum_{w=1}^{W} P_w(\text{Parkinson's})$$

Mean of per-window Parkinson's probabilities from the trained neural network.

### 12.2 Alzheimer's Disease — Gaze Instability

**Clinical basis**: AD patients show elevated fixation variability and erratic micro-saccades. The coefficient of variation of gaze speed captures this instability.

$$\text{CV} = \frac{\sigma(\text{speed})}{\mu(\text{speed}) + \epsilon}$$

$$\text{AD score} = \text{clip}\left(\frac{\text{CV} - 0.5}{3.0}, \; 0, \; 1\right)$$

| CV Range | Interpretation |
|---|---|
| 0.8 – 1.5 | Normal (healthy controls) |
| 1.5 – 3.0 | Elevated instability |
| > 3.0 | Pathological gaze instability |

### 12.3 Multiple Sclerosis — Binocular Discoordination

**Clinical basis**: MS frequently causes internuclear ophthalmoplegia (INO), where the medial longitudinal fasciculus is damaged, leading to mismatched left/right eye movements.

$$r_{LR} = \text{Pearson}(s_{\text{left}}, \; s_{\text{right}})$$

$$\text{MS score} = \text{clip}\left(\frac{1 - r_{LR}}{2.0}, \; 0, \; 1\right)$$

| Correlation | Interpretation |
|---|---|
| 0.8 – 1.0 | Normal binocular coordination |
| 0.3 – 0.8 | Mild discoordination |
| < 0.3 | Significant INO-like pattern |

### 12.4 Huntington's Disease — Saccadic Intrusion Rate

**Clinical basis**: HD patients exhibit involuntary square-wave jerks and saccadic intrusions — sudden, inappropriate eye movements that interrupt fixation.

$$\text{intrusion\_rate} = \frac{|\{t : s_t > \mu_s + 2\sigma_s\}|}{N}$$

$$\text{HD score} = \text{clip}\left(\frac{\text{rate} - 0.05}{0.20}, \; 0, \; 1\right)$$

| Intrusion Rate | Interpretation |
|---|---|
| 5% – 8% | Normal (healthy controls) |
| 8% – 15% | Elevated intrusions |
| > 15% | Pathological saccadic intrusions |

### 12.5 Method Badges

The frontend distinguishes the methods used:
- **Parkinson's**: `ML MODEL` badge (trained BiLSTM)
- **Alzheimer's**: `HEURISTIC` badge
- **Multiple Sclerosis**: `HEURISTIC` badge
- **Huntington's**: `HEURISTIC` badge

---

## 13. Risk Stratification

### 13.1 Thresholds

| Score | Level | Color | Recommendation |
|---|---|---|---|
| > 0.75 | **HIGH** | Red | Neurological consultation strongly advised |
| 0.45 – 0.75 | **MODERATE** | Amber | Periodic monitoring recommended |
| < 0.45 | **LOW** | Green | No immediate neurological concern detected |

### 13.2 Visualization

The **RiskGauge** component renders a radial bar chart:
- Outer ring shows the risk score as a percentage
- Ambient glow matches risk color (red/amber/green)
- Pulsing animation indicates risk severity
- Center displays the numerical score
- Recommendation text appears below

### 13.3 Window Distribution

The **RiskExplanation** component breaks down per-window probabilities:
- Bar chart showing each window's P(Parkinson's)
- Bars color-coded: green (<0.45), amber (0.45–0.75), red (>0.75)
- Reference lines at 45% and 75% thresholds
- Counts: X low, Y moderate, Z high-risk windows

---

## 14. Real-Time WebSocket Streaming

### 14.1 Architecture

```
Browser                           Server
  │                                 │
  │  WS /ws/analysis/{session_id}  │
  │ ──────────────────────────────►│
  │                                 │ _ws_connections[session_id].append(ws)
  │                                 │
  │         {"type": "log",        │
  │◄──────── "stage": "parse",     │ _send_progress() broadcasts
  │          "progress": 10}       │   to all subscribers
  │                                 │
  │         {"type": "windows",    │
  │◄──────── "window_count": 15}   │
  │                                 │
  │    {"type": "inference_update", │
  │◄─── "partial_window_probs":    │ Sent per-batch during inference
  │      [0.23, 0.45, 0.67]}      │
  │                                 │
  │         {"type": "result",     │
  │◄──────── "risk_score": 0.62,   │ Final result with all data
  │          "risk_level": "MOD",  │
  │          "window_probs": [...],│
  │          "condition_scores": { │
  │            "parkinsons": 0.62, │
  │            "alzheimers": 0.31, │
  │            "ms": 0.12,         │
  │            "huntingtons": 0.08 │
  │          }}                     │
  │                                 │
```

### 14.2 Message Types

| Type | Stage | Description |
|---|---|---|
| `log` | parse, normalize, windows, inference, aggregate, saving, complete | Progress updates with percentage |
| `windows` | windows | Reports window count |
| `inference_update` | inference | Partial per-window probabilities (streamed per batch) |
| `result` | complete | Final risk score, level, recommendation, all probabilities, condition scores |
| `error` | error | Error message if pipeline fails |

### 14.3 Frontend Handling (useProgress hook)

- Maintains `logs[]`, `progress`, `windowProbs[]`, `result` state
- Auto-reconnects on WebSocket close
- Updates LiveAnalysis component in real-time:
  - Terminal-style log display with timestamps and stage icons
  - Progress bar with shimmer animation
  - Live bar chart of inference probabilities as they arrive

---

## 15. Deployment & Docker

### 15.1 docker-compose.yml

```yaml
services:
  backend:
    build: ./backend
    ports: ["127.0.0.1:18503:18500"]
    environment:
      - DATABASE_URL=sqlite+aiosqlite:///./neurovision.db
      - MODEL_PATH=ml/models/neurovision_bilstm.pt
      - CORS_ORIGINS=["https://production-domain", "http://localhost:5173"]
      - MAX_UPLOAD_MB=200
    volumes: [backend-data:/app/data]
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      args:
        VITE_API_URL: https://production-domain
    ports: ["127.0.0.1:18502:18501"]
    depends_on: [backend]
    restart: unless-stopped
```

### 15.2 Backend Dockerfile

```dockerfile
FROM python:3.10-slim
# System deps for OpenCV, MediaPipe, PyTorch
RUN apt-get install -y gcc libc6-dev libgl1 libglib2.0-0 libgomp1
COPY requirements.txt → pip install
COPY app/ + ml/models/
EXPOSE 18500
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "18500"]
```

### 15.3 Frontend Dockerfile

```dockerfile
# Stage 1: Build
FROM node:20-slim AS builder
COPY package*.json → npm ci → npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY dist/ → /usr/share/nginx/html
COPY nginx.conf → SPA routing + gzip
EXPOSE 18501
```

### 15.4 Port Mapping

| Service | Internal | External | Purpose |
|---|---|---|---|
| Backend | 18500 | 18503 | FastAPI + WebSocket |
| Frontend | 18501 | 18502 | Nginx (static SPA) |
| Vite Dev | 5173 | 5173 | Dev server (proxies to backend) |

### 15.5 Development Setup

```
# Terminal 1: Backend
cd backend && uvicorn app.main:app --port 18500 --reload

# Terminal 2: Frontend
cd frontend && npm run dev
# Vite proxies /api → localhost:18500
# Vite proxies /ws  → ws://localhost:18500
```

---

## 16. All Equations Reference

### Preprocessing

| Name | Equation |
|---|---|
| Min-Max Normalization | $x_{\text{norm}} = \frac{x - x_{\min}}{x_{\max} - x_{\min}}$ |
| Sliding Window Count | $W = \lfloor \frac{N - 300}{100} \rfloor + 1$ |
| Moving Average | $\bar{x}_t = \frac{1}{9} \sum_{i=-4}^{4} x_{t+i}$ |

### LSTM Gates

| Gate | Equation |
|---|---|
| Forget | $f_t = \sigma(W_f [h_{t-1}, x_t] + b_f)$ |
| Input | $i_t = \sigma(W_i [h_{t-1}, x_t] + b_i)$ |
| Candidate | $\tilde{C}_t = \tanh(W_C [h_{t-1}, x_t] + b_C)$ |
| Cell Update | $C_t = f_t \odot C_{t-1} + i_t \odot \tilde{C}_t$ |
| Output | $o_t = \sigma(W_o [h_{t-1}, x_t] + b_o)$ |
| Hidden | $h_t = o_t \odot \tanh(C_t)$ |
| BiLSTM Concat | $h_{\text{final}} = [\overrightarrow{h_T} \| \overleftarrow{h_1}]$ |

### Training

| Name | Equation |
|---|---|
| Cross-Entropy Loss | $\mathcal{L} = -\sum_{c=1}^{2} y_c \log(\hat{y}_c)$ |
| AdamW Update | $\theta_{t+1} = \theta_t - \eta(\frac{\hat{m}_t}{\sqrt{\hat{v}_t} + \epsilon} + \lambda\theta_t)$ |
| LR Reduction | $\eta_{\text{new}} = \eta_{\text{old}} \times 0.5$ |
| Gradient Clip | $\|\nabla\theta\|_2 \leq 1.0$ |

### Augmentation

| Name | Equation |
|---|---|
| Gaussian Noise | $x' = x + \mathcal{N}(0, \sigma^2), \; \sigma \sim U(0.005, 0.04)$ |
| DC Shift | $x' = x + \delta, \; \delta \sim U(-0.15, 0.15)$ |
| Amplitude Scale | $x' = \bar{x} + s(x - \bar{x}), \; s \sim U(0.65, 1.35)$ |
| Range Remap | $x' \in [c-h, c+h], \; c \sim U(0.35, 0.65), \; h \sim U(0.12, 0.22)$ |

### Condition Scoring

| Condition | Equation |
|---|---|
| Parkinson's | $\text{score} = \text{mean}(P_w)$ |
| Alzheimer's | $\text{score} = \text{clip}(\frac{\text{CV} - 0.5}{3.0}, 0, 1)$ |
| Multiple Sclerosis | $\text{score} = \text{clip}(\frac{1 - r_{LR}}{2.0}, 0, 1)$ |
| Huntington's | $\text{score} = \text{clip}(\frac{\text{rate} - 0.05}{0.20}, 0, 1)$ |

### Risk Stratification

| Threshold | Level |
|---|---|
| score > 0.75 | HIGH |
| 0.45 ≤ score ≤ 0.75 | MODERATE |
| score < 0.45 | LOW |

---

## 17. Key Files Reference

| File | Purpose |
|---|---|
| `frontend/src/App.tsx` | Root component, routing |
| `frontend/src/pages/Home.tsx` | Landing page with upload cards |
| `frontend/src/pages/Analysis.tsx` | Real-time analysis + results |
| `frontend/src/components/home/HeroBanner.tsx` | Animated hero with iris SVG |
| `frontend/src/components/home/WebcamCapture.tsx` | Live webcam + MediaPipe |
| `frontend/src/components/analysis/LiveAnalysis.tsx` | Processing terminal + live chart |
| `frontend/src/components/analysis/RiskGauge.tsx` | Radial risk visualization |
| `frontend/src/components/analysis/ConditionScores.tsx` | 4-condition screening |
| `frontend/src/hooks/useProgress.ts` | WebSocket progress hook |
| `frontend/src/services/api.ts` | Axios API client |
| `frontend/src/context/AuthContext.tsx` | JWT auth state |
| `backend/app/main.py` | FastAPI app, lifespan, WebSocket |
| `backend/app/config.py` | Pydantic settings |
| `backend/app/api/routes/analysis.py` | Upload endpoints + background tasks |
| `backend/app/api/routes/auth.py` | Register, login, JWT |
| `backend/app/db/session.py` | SQLAlchemy engine + migrations |
| `backend/app/models/database.py` | User, Session, AnalysisResult ORM |
| `backend/app/models/schemas.py` | Pydantic response models |
| `backend/app/services/ml/model.py` | BiLSTM architecture + singleton loader |
| `backend/app/services/ml/inference.py` | Parsing, normalization, windowing, inference, condition scores |
| `backend/app/services/ml/video.py` | MediaPipe iris extraction, smoothing, thumbnail |
| `backend/ml/training/modal_train_bilstm.py` | Modal.com GPU training script |
| `backend/ml/training/modal_download.py` | Download weights from Modal volume |
| `backend/ml/models/neurovision_bilstm.pt` | Trained model weights (2.2 MB) |
| `backend/ml/models/model_meta.json` | Model hyperparameters + accuracy |
| `docker-compose.yml` | Service orchestration |
| `backend/Dockerfile` | Python + ML deps container |
| `frontend/Dockerfile` | Node build → Nginx container |
| `neurovision_1.ipynb` | Jupyter notebook (prototyping) |
