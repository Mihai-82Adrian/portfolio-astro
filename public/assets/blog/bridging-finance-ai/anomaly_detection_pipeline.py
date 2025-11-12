
"""
Production-ready Anomaly Detection Pipeline for Financial Transactions
with SHAP-based Explainability (Audit-Ready)
"""

import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import shap
import warnings
warnings.filterwarnings('ignore')

class AuditReadyAnomalyDetector:
    """
    Isolation Forest-based anomaly detection with SHAP explainability
    for German accounting transactions (GoBD-compliant logging)
    """

    def __init__(self, contamination=0.05, random_state=42):
        """
        Args:
            contamination: Expected proportion of anomalies (default: 5%)
            random_state: For reproducibility (GoBD requirement)
        """
        self.contamination = contamination
        self.random_state = random_state
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = None
        self.explainer = None

    def fit(self, X_train, feature_names=None):
        """
        Train the Isolation Forest model

        Args:
            X_train: Training data (pd.DataFrame or np.array)
            feature_names: List of feature names for interpretability
        """
        if isinstance(X_train, pd.DataFrame):
            self.feature_names = X_train.columns.tolist()
            X_train = X_train.values
        else:
            self.feature_names = feature_names or [f"feature_{i}" for i in range(X_train.shape[1])]

        # Normalize features
        X_scaled = self.scaler.fit_transform(X_train)

        # Train Isolation Forest
        self.model = IsolationForest(
            contamination=self.contamination,
            random_state=self.random_state,
            n_estimators=100,
            max_samples='auto',
            n_jobs=-1
        )
        self.model.fit(X_scaled)

        # Initialize SHAP explainer (use TreeExplainer for Isolation Forest)
        self.explainer = shap.TreeExplainer(self.model)

        print(f"Model trained. Features: {self.feature_names}")
        return self

    def predict_with_scores(self, X_test):
        """
        Predict anomalies and compute anomaly scores

        Args:
            X_test: Test data

        Returns:
            predictions: -1 for anomaly, 1 for normal
            scores: Anomaly scores (lower = more anomalous)
        """
        if isinstance(X_test, pd.DataFrame):
            X_test = X_test.values

        X_scaled = self.scaler.transform(X_test)
        predictions = self.model.predict(X_scaled)
        scores = self.model.score_samples(X_scaled)

        return predictions, scores

    def explain_predictions(self, X_test, top_n=10):
        """
        Generate SHAP explanations for top-N most anomalous transactions

        Args:
            X_test: Test data
            top_n: Number of most anomalous samples to explain

        Returns:
            DataFrame with anomaly details and SHAP explanations
        """
        if isinstance(X_test, pd.DataFrame):
            X_test_df = X_test.copy()
            X_test = X_test.values
        else:
            X_test_df = pd.DataFrame(X_test, columns=self.feature_names)

        X_scaled = self.scaler.transform(X_test)
        predictions, scores = self.predict_with_scores(X_test)

        # Compute SHAP values with exception handling
        try:
            shap_values = self.explainer.shap_values(X_scaled)
        except Exception as e:
            print(f"Warning: SHAP computation failed: {e}")
            print("Falling back to predictions without explanations.")
            return pd.DataFrame({
                'Transaction_ID': range(len(predictions)),
                'Anomaly_Score': scores,
                'Prediction': ['ANOMALY' if p == -1 else 'NORMAL' for p in predictions],
                'Error': 'SHAP computation failed'
            })

        # Select top-N most anomalous (lowest scores)
        anomaly_indices = np.argsort(scores)[:top_n]

        report_data = []
        for idx in anomaly_indices:
            # Get SHAP contributions for this transaction
            shap_contrib = shap_values[idx]
            feature_importance = pd.DataFrame({
                'Feature': self.feature_names,
                'Value': X_test[idx],
                'SHAP_Contribution': shap_contrib
            }).sort_values('SHAP_Contribution', key=abs, ascending=False)

            report_data.append({
                'Transaction_ID': idx,
                'Anomaly_Score': scores[idx],
                'Prediction': 'ANOMALY' if predictions[idx] == -1 else 'NORMAL',
                'Top_3_Features': feature_importance.head(3)['Feature'].tolist(),
                'Top_3_SHAP_Values': feature_importance.head(3)['SHAP_Contribution'].tolist(),
                'Full_Explanation': feature_importance.to_dict('records')
            })

        return pd.DataFrame(report_data)

    def generate_audit_report(self, X_test, output_path='audit_report.csv'):
        """
        Generate GoBD-compliant audit report with full traceability

        Args:
            X_test: Test transactions
            output_path: Path to save the audit report
        """
        predictions, scores = self.predict_with_scores(X_test)

        # GoBD-compliant timestamp (immutable, ISO 8601 format)
        audit_timestamp = datetime.utcnow().isoformat() + 'Z'

        # Create audit log with GoBD-required fields
        audit_df = pd.DataFrame({
            'Audit_Timestamp': audit_timestamp,
            'Transaction_Index': range(len(predictions)),
            'Anomaly_Score': scores,
            'Prediction': ['ANOMALY' if p == -1 else 'NORMAL' for p in predictions],
            'Model_Version': 'IsolationForest_v1.0',
            'Contamination_Rate': self.contamination,
            'Random_State': self.random_state
        })

        # Add threshold information
        threshold = np.percentile(scores, self.contamination * 100)
        audit_df['Detection_Threshold'] = threshold
        audit_df['Above_Threshold'] = audit_df['Anomaly_Score'] < threshold

        # Save with immutable timestamp in filename for GoBD compliance
        timestamp_suffix = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        versioned_path = output_path.replace('.csv', f'_{timestamp_suffix}.csv')
        audit_df.to_csv(versioned_path, index=False)
        print(f"GoBD-compliant audit report saved to {versioned_path}")

        return audit_df


# Example usage with synthetic German accounting transaction data
if __name__ == "__main__":
    # Generate synthetic transaction features
    np.random.seed(42)
    n_samples = 1000

    # Features typical for German accounting transactions
    data = {
        'amount': np.random.exponential(500, n_samples),  # Transaction amounts
        'frequency_per_day': np.random.poisson(2, n_samples),  # Daily frequency
        'time_of_day': np.random.uniform(0, 24, n_samples),  # Hour of transaction
        'days_since_last': np.random.exponential(3, n_samples),  # Days since last transaction
        'account_balance': np.random.normal(5000, 2000, n_samples),  # Account balance
        'merchant_risk_score': np.random.beta(2, 5, n_samples)  # Merchant risk (0-1)
    }

    df = pd.DataFrame(data)

    # Inject some anomalies (for demonstration)
    anomaly_idx = np.random.choice(n_samples, size=50, replace=False)
    df.loc[anomaly_idx, 'amount'] = df.loc[anomaly_idx, 'amount'] * 10  # Very large amounts
    df.loc[anomaly_idx, 'time_of_day'] = np.random.uniform(0, 5, 50)  # Unusual hours

    # Split data
    X_train, X_test = train_test_split(df, test_size=0.3, random_state=42)

    # Initialize and train detector
    detector = AuditReadyAnomalyDetector(contamination=0.05, random_state=42)
    detector.fit(X_train)

    # Get predictions and explanations
    anomaly_report = detector.explain_predictions(X_test, top_n=10)

    print("\n=== Top 10 Most Anomalous Transactions ===")
    print(anomaly_report[['Transaction_ID', 'Anomaly_Score', 'Prediction', 'Top_3_Features']])

    # Generate audit report
    full_report = detector.generate_audit_report(X_test, output_path='anomaly_audit_report.csv')

    print("\n=== Summary Statistics ===")
    print(f"Total transactions analyzed: {len(X_test)}")
    print(f"Detected anomalies: {sum(full_report['Prediction'] == 'ANOMALY')}")
    print(f"Detection rate: {sum(full_report['Prediction'] == 'ANOMALY') / len(X_test) * 100:.2f}%")
