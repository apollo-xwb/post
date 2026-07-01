# Product Requirements Document (PRD)
## Project Name: PostNet Print OS (Pre-Press & Print-Job Constructor)

---

### 1. Executive Summary & Problem Statement

**PostNet Print OS** is an interactive, browser-native print constructor and pre-press prep workspace. 

#### The Problem
When customers order custom prints (documents, posters, flyers, or business cards) from local print shops, they frequently upload design files (PDFs, docx, vector files) that suffer from alignment issues, safe-bleed violations, or incorrect dimensions. This results in costly print-press errors, ruined paper stocks, and tedious human-operator back-and-forth communication. Standard sandboxed browser iframe environments also block native PDF file previewing, making previewing uploaded PDF pages directly in client-side web tools notoriously difficult.

#### The Solution
PostNet Print OS provides a client-side portal where users can:
- Construct exact print specifications (dimensions, paper weight, finishes, color modes).
- Securely upload print files.
- **Preview real PDF documents and images directly** within an interactive pre-press alignment frame—fully bypassing sandboxed iframe blockers via client-side PDF-to-image render pipelines.
- Calibrate crop offsets, zoom ratios, margins, and safe bleed lines manually to guarantee press compatibility.
- Receive transparent, real-time quote calculations.
- Submit the print order with local tracking states backed by persistent cloud storage.

---

### 2. User Personas & Target Audience
1. **The Walk-In Customer**: Needs to quickly upload a document from their phone, get an instant cost quotation, and verify how it fits standard sizes before clicking buy.
2. **The Professional Designer**: Needs pixel-perfect pre-press proofing (e.g., checking safe bleed zones, margins, black & white printing contrasts, and alignment offsets).
3. **The Print Shop Operator**: Receives pre-verified orders with precise alignment matrices (offset X/Y, scale, rotation) and pre-press checks already logged, dramatically reducing job preparation overhead.

---

### 3. Core Feature Requirements

| Feature ID | Module Name | Description | Priority |
|---|---|---|---|
| **FEAT-01** | **Product & Specs Selector** | Dynamic spec constructor supporting Documents, Posters, Flyers, and Business Cards, with automated paper-stock, finish, and printing-side constraints. | P0 |
| **FEAT-02** | **High-Fidelity PDF Engine** | Dynamic loading of PDF.js to parse and render uploaded PDF documents as high-fidelity PNG raster images directly in the browser. | P0 |
| **FEAT-03** | **Interactive Pre-Press Canvas** | Interactive viewport with safe bleed guide lines, drag-to-pan translation, scaling/zoom sliders, rotational alignment, and grayscale contrast filtering. | P0 |
| **FEAT-04** | **QR Mobile Beaming Bridge** | Dynamic wireless uploader simulation allowing desktop users to scan a QR code and beam mobile documents securely to the active pre-press workspace. | P1 |
| **FEAT-05** | **Real-Time Price Calc** | Automated pricing model reflecting paper size multipliers, material finishes, color modes, volume brackets, and turnaround urgency tiers. | P0 |
| **FEAT-06** | **Auth & Order Tracking** | Firebase Auth portal for tracking submitted jobs, order state logs, and interactive historic pre-press proofs. | P1 |

---

### 4. Technical Architecture

#### Front-End Layout & Styling
- **Framework**: React (v19) built on Vite, compiling to static distribution bundles.
- **Styling**: Tailwind CSS utility design classes, optimized with micro-spacing for dense layout ratios.
- **Iconography**: Lucide React vectors.

#### Document Pipeline
- **PDF Renderer**: Decoupled asynchronous `pdfjs-dist` wrapper. 
- **Sequence**:
  1. File Upload $\rightarrow$ Binary byte read via `FileReader.readAsArrayBuffer()`.
  2. PDF Parser $\rightarrow$ Loads document context and extracts Page 1.
  3. Graphics Rasterizer $\rightarrow$ Render to an offscreen `<canvas>` at a high $1.8\times$ scale multiplier.
  4. Data Output $\rightarrow$ `canvas.toDataURL('image/png')` injected directly into the canvas mockup layer.

#### Persistence Layer
- **Database**: Cloud Firestore. Store submitted job records including price details, pre-press calibration metadata (offsets, rotation, fit modes), and user IDs.
- **Authentication**: Firebase Authentication. Enables persistent customer portals and secure order logs.

---

### 5. UI/UX & Interaction Design Flow

#### Step 1: Specifications Constructor (The "Aesthetic Bento")
- Interactive cards for product category choice.
- Custom sliders and specifications pickers (e.g., single vs double sided, color vs monochrome).
- Presets for common tasks (e.g., "Bank Statement", "HQ Presentation", "Corporate Flyer").

#### Step 2: Live Calibration & Pre-Press Proofing
- Clean split-screen layout:
  - **Left column**: File dropzone portal (supporting drag-and-drop or manual browses) + Active file list.
  - **Right column**: Pre-Press Proof & Crop Studio. Displays the document/image in real-time, framed inside exact dimensions of the chosen medium. Included are safe bleed lines (Trim Zone guides) and alignment control boards.
- Fluid drag-and-drop canvas translations with custom zoom, rotation, and color preview filters.

#### Step 3: Checkout & Tracking
- Dynamic billing calculations with South African VAT breakdown.
- Multi-channel payment simulations (Stripe, PayFast, or Shop Collection).
- Order summary dashboard tracking pre-press state logs.

---

### 6. Success Metrics & Performance Slates
- **Rendering Speed**: Client-side PDF page rasterization in `< 600ms` for typical 10MB documents.
- **Interactive Framerate**: Smooth 60FPS dragging and translation updates on the alignment canvas.
- **Error Reduction**: Zero "broken document image" occurrences for sandboxed PDF files.
