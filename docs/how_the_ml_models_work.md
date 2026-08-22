# How the AgroFresh AI / ML Models Work

This document provides a detailed breakdown of the algorithms, equations, data sources, and internal mechanics powering the four core AI models in **AgroFresh**.

---

## 1. YOLOv5 Produce Quality Scorer 📷

**File**: [quality_model.py](file:///C:/Users/noraa/Desktop/Agrofresh/backend-ml/models/quality_model.py)

### How It Works:
The Quality Scorer evaluates uploaded produce images using multi-region computer vision and color histogram analysis.

### Step-by-Step Algorithm:
1. **Color & Ripeness Analysis**:
   - Extracts RGB color channel means ($\mu_R, \mu_G, \mu_B$) from the image.
   - Computes normalized Brightness and Saturation metrics:
     $$\text{Brightness} = \frac{\mu_R + \mu_G + \mu_B}{255 \times 3} \times 10$$
     $$\text{Saturation} = \frac{\max(\mu_R, \mu_G, \mu_B)}{255} \times 10$$
   - Calculates baseline color score: $\text{Color Score} = \frac{\text{Brightness} + \text{Saturation}}{20} \times 100$.

2. **YOLOv5 Spatial Defect Detection**:
   - **Region Sampling**: Extracts sub-regions (Center, Top-Left, Bottom-Right) to detect localized bruising and spots.
   - **Color Shift Check**: Measures variance $\text{Var}(R, G, B)$. Abnormal variance indicates discoloration or bruising (adds $+0.10$ defect penalty).
   - **Sobel Texture & Surface Damage Detection**: Converts pixels to grayscale and measures intensity gradient magnitude $E_{ij} = |I_{i+1, j+1} - I_{i, j}|$.
   - **Edge Density**: Computes the ratio of high-contrast edge pixels ($E_{ij} > 50$). If Edge Density $> 0.15$, it flags `surface_damage` (adds $+0.15$ defect penalty).

3. **Final Score Calculation**:
   $$\text{Quality Score} = \max\left(0, \min\left(100, \text{Color Score} - (\text{Defect Penalty} \times 100)\right)\right)$$
   $$\text{Confidence} = \min\left(0.95, 0.65 + 0.30 \times (1 - \text{Defect Penalty})\right)$$

---

## 2. Regional Harvest Predictor 🌾

**File**: [harvest_predictor.py](file:///C:/Users/noraa/Desktop/Agrofresh/backend-ml/models/harvest_predictor.py)

### How It Works:
Predicts when crops will mature based on planting date, crop biological growth cycles, and regional micro-climate calibration across Ghana.

### Biological & Climate Mechanics:
1. **Base Biological Growth Cycles**:
   - Tomato: 70 days | Yam: 150 days | Maize: 90 days | Lettuce: 40 days | Pepper: 75 days | Cassava: 300 days.

2. **Ghanaian Regional Climate Multipliers**:
   - Adjusts days-to-harvest based on temperature and humidity across 14 regions:
     - **Ashanti** ($1.0\times$): Baseline temperate rainforest climate.
     - **Greater Accra** ($0.95\times$): Coastal heat accelerates growth cycle by 5%.
     - **Northern / Upper East** ($1.05\times - 1.08\times$): Dryer savanna climate extends growth cycle by 5–8%.
     - **Western / Central** ($0.96\times - 0.97\times$): High rainfall accelerates growth.

3. **Harvest Window Output**:
   $$\text{Adjusted Days } D_{adj} = \text{round}(B_{\text{base}} \times M_{\text{region}})$$
   $$\text{Typical Harvest} = D_{\text{planting}} + D_{adj} \text{ days}$$
   $$\text{Earliest Window} = D_{\text{planting}} + (0.88 \times D_{adj}) \text{ days (-12\%)}$$
   $$\text{Latest Window} = D_{\text{planting}} + (1.12 \times D_{adj}) \text{ days (+12\%)}$$

---

## 3. Storage-Aware Freshness Calculator ⏱️

**File**: [freshness_calculator.py](file:///C:/Users/noraa/Desktop/Agrofresh/backend-ml/models/freshness_calculator.py)

### How It Works:
Models the degradation rate of produce over time based on initial quality score and storage condition.

### Degradation Mathematics:
1. **Storage Condition Rates ($r_{\text{deg}}$)**:
   - **Refrigerated**: $1\%$ loss per day ($r = 0.01$).
   - **Optimal Storage**: $2\%$ loss per day ($r = 0.02$).
   - **Room Temperature**: $8\%$ loss per day ($r = 0.08$).

2. **Exponential Decay Equation**:
   Let $\Delta t = \text{Today} - D_{\text{harvest}}$ (days since harvest), and $Q_0$ be initial quality:
   $$\text{Freshness Score } F(t) = \max\left(0, \min\left(100, Q_0 \times (1 - r_{\text{deg}})^{\Delta t}\right)\right)$$

3. **Status Classification**:
   - **Days Remaining**: $\text{Shelf Life} - \Delta t$.
   - **Status Categories**:
     - $>70\%$ shelf life remaining ➔ `excellent` (95% confidence)
     - $>40\%$ shelf life remaining ➔ `good` (85% confidence)
     - $>0\%$ shelf life remaining ➔ `fair` (70% confidence)
     - $\le 0$ days remaining ➔ `expired` (90% confidence)

---

## 4. Seasonal Price Forecaster & Selling Optimizer 📈

**File**: [price_forecaster.py](file:///C:/Users/noraa/Desktop/Agrofresh/backend-ml/models/price_forecaster.py)

### How It Works:
Combines base Ghana market pricing, 12-month seasonal supply/demand curves, quality premiums, and freshness discounts to forecast future prices and identify the best selling date.

### Pricing Model Equation:
$$\text{Forecasted Price } P_{\text{final}} = P_{\text{base}} \times M_{\text{season}}(\text{month}) \times M_{\text{quality}}(Q) \times M_{\text{fresh}}(F_{\text{status}})$$

### Factors & Interpolations:
1. **Base GHS Price ($P_{\text{base}}$)**: Base market rate per unit (e.g. Tomato = GH₵ 2.50/kg, Yam = GH₵ 4.00/kg).
2. **Seasonal Demand Multipliers ($M_{\text{season}}$)**:
   - Reflects seasonal peak harvest vs lean seasons in Ghana (e.g., Tomato prices increase to $1.4\times$ in Dec–March due to holiday demand, and drop to $0.8\times$ in May–June during major harvest abundance).
3. **Piecewise Quality Curve ($M_{\text{quality}}$)**:
   - Linearly interpolates quality premiums/discounts:
     - Quality $100$ ➔ $+25\%$ premium ($1.25\times$)
     - Quality $90$ ➔ $+15\%$ premium ($1.15\times$)
     - Quality $80$ ➔ Baseline ($1.00\times$)
     - Quality $70$ ➔ $-10\%$ discount ($0.90\times$)
     - Quality $60$ ➔ $-25\%$ discount ($0.75\times$)
4. **Freshness Impact ($M_{\text{fresh}}$)**:
   - `excellent` ($1.0\times$), `good` ($0.95\times$), `fair` ($0.80\times$), `expired` ($0.30\times$).

5. **Optimal Selling Date Recommendation**:
   - The algorithm evaluates $P_{\text{final}}$ for each day over a 21-day horizon ($d = 0..21$).
   - It identifies the exact day $d_{\text{best}}$ that yields maximum price realization before freshness degradation reduces the produce value.

---

## Model Pipeline Summary

```
   [ Raw Photo Upload ] ──► YOLOv5 Quality Scorer ──► Quality Score (0-100%)
                                                             │
   [ Harvest Date ] ──────► Freshness Calculator  ──► Freshness Status (Fresh/Good/Fair)
                                                             │
   [ Month & Region ] ────► Seasonal Forecaster  ──► Forecasted Market Price & Best Selling Date
```
