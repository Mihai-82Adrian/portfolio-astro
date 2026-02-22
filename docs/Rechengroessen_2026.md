{
  "metadata": {
    "title": "Offizielle Rechengrößen Sozialversicherung 2026",
    "source": "Bundesministerium für Arbeit und Soziales (BMAS) - Sozialversicherungsrechengrößen-Verordnung 2026",
    "effective_date": "2026-01-01",
    "generated_date": "2026-01-10",
    "wage_growth_basis_2024": "5.16%"
  },
  "global_rates_2026": {
    "description": "Sozialversicherungsbeiträge 2026 (allgemein gültig)",
    "rentenversicherung_rv": {
      "percent": 18.6,
      "employer_share_percent": 9.3,
      "employee_share_percent": 9.3,
      "note": "Allgemeine Rentenversicherung"
    },
    "arbeitslosenversicherung_av": {
      "percent": 2.6,
      "employer_share_percent": 1.3,
      "employee_share_percent": 1.3
    },
    "pflegeversicherung_pv": {
      "base_rate_percent": 3.6,
      "employer_share_percent": 1.8,
      "employee_share_percent": 1.8,
      "note": "Basis rate for parents/employees with children"
    },
    "pflegeversicherung_kinderlosenzuschlag": {
      "additional_rate_percent": 0.6,
      "employee_only": true,
      "total_for_childless_percent": 4.2,
      "employee_share_childless_percent": 2.4,
      "employer_share_childless_percent": 1.8,
      "note": "Kinderlose (childless) employees aged 23+ pay entire surcharge"
    },
    "krankenversicherung_kv": {
      "general_rate_percent": 14.6,
      "reduced_rate_percent": 14.0,
      "average_additional_contribution_percent": 2.9,
      "employer_share_percent": 7.3,
      "employee_share_percent": 7.3,
      "note": "General rate + individual health insurance provider Zusatzbeitrag varies"
    }
  },
  "limits_beitragsbemessungsgrenzen_2026": {
    "krankenversicherung_kv": {
      "yearly_eur": 69750,
      "monthly_eur": 5812.50,
      "change_from_2025_yearly": 3600,
      "change_from_2025_percent": 5.44
    },
    "rentenversicherung_allgemein_ost_west": {
      "yearly_eur": 101400,
      "monthly_eur": 8450,
      "change_from_2025_yearly": 4800,
      "change_from_2025_percent": 4.98,
      "note": "UNIFIED for East and West since 2026"
    },
    "rentenversicherung_west_historical": {
      "yearly_eur": 101400,
      "monthly_eur": 8450,
      "note": "Applies as of 2026 - same as East"
    },
    "rentenversicherung_east_historical": {
      "yearly_eur": 101400,
      "monthly_eur": 8450,
      "note": "Applies as of 2026 - same as West"
    },
    "knappschaftliche_rentenversicherung": {
      "yearly_eur": 124800,
      "monthly_eur": 10400
    },
    "versicherungspflichtgrenze_kv": {
      "yearly_eur": 77400,
      "monthly_eur": 6450,
      "description": "Jahresarbeitsentgeltgrenze - income threshold for private insurance eligibility"
    }
  },
  "bezugsgröße_2026": {
    "monthly_eur": 3955,
    "yearly_eur": 47460,
    "note": "Bezugsgröße in der Sozialversicherung - unified for all regions"
  },
  "regional_specifics_sachsen": {
    "state": "SACHSEN (Saxony)",
    "note": "Sonderregelung - Special regulation applies due to historical reasons (no holiday was cut when nursing care insurance was introduced in 2005)",
    "pflegeversicherung_rates_sachsen": {
      "description": "Saxony has unique Pflegeversicherung rates compared to all other states",
      "employee_with_children": {
        "base_rates": [
          {
            "children_count": 1,
            "rate_percent": 2.3
          },
          {
            "children_count": 2,
            "rate_percent": 2.05
          },
          {
            "children_count": 3,
            "rate_percent": 1.8
          },
          {
            "children_count": 4,
            "rate_percent": 1.55
          },
          {
            "children_count": 5,
            "rate_percent": 1.3
          }
        ]
      },
      "employee_without_children_childless": {
        "rate_percent": 2.9,
        "kinderlosenzuschlag_percent": 0.6,
        "total_childless_percent": 3.5,
        "note": "Higher employee burden compared to other states (2.4% base there)"
      },
      "employer_share": {
        "rate_percent": 1.3,
        "applies_regardless_of_children": true,
        "note": "Lower burden compared to other states (1.8% elsewhere)"
      }
    },
    "pflegeversicherung_comparison": {
      "sachsen_vs_other_states": {
        "metric": "Pflegeversicherung burden distribution",
        "sachsen": {
          "employee_with_1_child": "2.3%",
          "employee_with_5_children": "1.3%",
          "employee_childless": "3.5% (2.9% base + 0.6% kinderlosenzuschlag)",
          "employer_all_cases": "1.3%"
        },
        "other_states": {
          "employee_with_1_child": "1.8%",
          "employee_with_5_children": "0.8%",
          "employee_childless": "3.0% (2.4% base + 0.6% kinderlosenzuschlag)",
          "employer_all_cases": "1.8%"
        },
        "key_difference": "Saxony shifts employer burden to employees compared to rest of Germany"
      }
    }
  },
  "health_insurance_providers_zusatzbeitrag_2026": {
    "orientation_value_bmi": {
      "percent": 2.9,
      "source": "Bundesgesundheitsministerium",
      "note": "Official guideline value for health insurance provider additional contributions"
    },
    "major_providers": {
      "techniker_krankenkasse_tk": {
        "provider_name": "Techniker Krankenkasse",
        "zusatzbeitrag_2026_percent": 2.69,
        "total_rate_2026_percent": 17.29,
        "general_rate_percent": 14.6,
        "employer_share_percent": 8.645,
        "employee_share_percent": 8.645,
        "change_from_2025_zusatzbeitrag_percent": 0.24,
        "status_vs_average": "below average",
        "rank_among_major_providers": "lowest",
        "monthly_cost_per_3000_gross_eur": 259.35,
        "annual_cost_per_42000_gross_eur": 3111.40,
        "note": "Most competitive pricing among major nationwide-open providers"
      },
      "aok_nordost": {
        "provider_name": "AOK Nordost",
        "zusatzbeitrag_2026_percent": 3.5,
        "total_rate_2026_percent": 18.1,
        "general_rate_percent": 14.6,
        "employer_share_percent": 9.05,
        "employee_share_percent": 9.05,
        "change_from_2025_zusatzbeitrag_percent": 0.0,
        "status_vs_average": "above average",
        "rank_among_major_providers": "highest",
        "coverage_area": "Berlin, Brandenburg, Mecklenburg-Vorpommern",
        "monthly_cost_per_3000_gross_eur": 271.50,
        "annual_cost_per_42000_gross_eur": 3258.00,
        "note": "Regional provider; increased significantly in 2025, now stable"
      },
      "barmer": {
        "provider_name": "Barmer",
        "zusatzbeitrag_2026_percent": 3.29,
        "total_rate_2026_percent": 17.89,
        "general_rate_percent": 14.6,
        "employer_share_percent": 8.945,
        "employee_share_percent": 8.945,
        "change_from_2025_zusatzbeitrag_percent": 0.0,
        "status_vs_average": "above average",
        "rank_among_major_providers": "second highest",
        "coverage_area": "nationwide",
        "monthly_cost_per_3000_gross_eur": 268.35,
        "annual_cost_per_42000_gross_eur": 3220.20,
        "price_increase_history": "2024: 2.19% -> 2025: 3.29% -> 2026: 3.29% (stable)",
        "note": "Had major increase in 2025, now holding stable; second-largest statutory insurer"
      },
      "dak_gesundheit": {
        "provider_name": "DAK-Gesundheit",
        "zusatzbeitrag_2026_percent": 3.2,
        "total_rate_2026_percent": 17.8,
        "general_rate_percent": 14.6,
        "employer_share_percent": 8.9,
        "employee_share_percent": 8.9,
        "change_from_2025_zusatzbeitrag_percent": 0.4,
        "status_vs_average": "above average",
        "rank_among_major_providers": "third",
        "coverage_area": "nationwide",
        "monthly_cost_per_3000_gross_eur": 267.00,
        "annual_cost_per_42000_gross_eur": 3204.00,
        "price_increase_history": "2025: 2.8% -> 2026: 3.2%",
        "note": "Third-largest statutory insurer in Germany; increased from 2.8% in 2025"
      }
    }
  },
  "durchschnittsentgelt_2026": {
    "provisional_2026_yearly_eur": 51944,
    "provisional_2026_monthly_eur": 4328.67,
    "final_2024_yearly_eur": 47085,
    "final_2024_monthly_eur": 3923.75,
    "growth_from_2024_to_2026_provisional_percent": 10.33
  },
  "conversion_notes": {
    "east_west_unification": "As of 2026, all Beitragsbemessungsgrenzen (contribution assessment limits) for general RV and ALV are unified for East and West Germany. The East limit is no longer used.",
    "sachsen_exception": "Saxony remains the only state with a special nursing care insurance regulation (Sonderregelung Pflegeversicherung) due to historical circumstances from 2005.",
    "health_insurance_consolidation": "Most major health insurers published 2026 Zusatzbeitrag rates in December 2025. Rates shown are official as of January 10, 2026."
  },
  "summary_table_2026": {
    "contribution_rates_all_systems": {
      "system": [
        {
          "name": "Rentenversicherung (RV)",
          "total_percent": 18.6,
          "employer_percent": 9.3,
          "employee_percent": 9.3,
          "status": "unchanged"
        },
        {
          "name": "Arbeitslosenversicherung (AV)",
          "total_percent": 2.6,
          "employer_percent": 1.3,
          "employee_percent": 1.3,
          "status": "unchanged"
        },
        {
          "name": "Pflegeversicherung - Base (with children)",
          "total_percent": 3.6,
          "employer_percent": 1.8,
          "employee_percent": 1.8,
          "status": "unchanged"
        },
        {
          "name": "Pflegeversicherung - Childless",
          "total_percent": 4.2,
          "employer_percent": 1.8,
          "employee_percent": 2.4,
          "status": "unchanged"
        },
        {
          "name": "Krankenversicherung (KV) - General",
          "total_percent": 14.6,
          "employer_percent": 7.3,
          "employee_percent": 7.3,
          "status": "unchanged"
        },
        {
          "name": "Krankenversicherung - Average Zusatzbeitrag",
          "total_percent": 2.9,
          "employer_percent": 1.45,
          "employee_percent": 1.45,
          "status": "orientation value"
        }
      ]
    }
  },
  "audit_checklist_2026": {
    "critical_changes": [
      {
        "item": "East/West RV BBG unification",
        "status": "COMPLETE",
        "value": "€8,450/month unified",
        "action_required": "Update payroll system to remove East/West conditional logic"
      },
      {
        "item": "KV BBG increase",
        "status": "IMPLEMENTED",
        "value": "€5,812.50/month (from €5,512.50)",
        "action_required": "Recalculate KV deductions for high-income earners"
      },
      {
        "item": "Saxony PV special rates",
        "status": "PERSISTENT",
        "value": "Continues as unique state exception",
        "action_required": "Verify Saxony employees use special rate tables"
      },
      {
        "item": "Health insurance provider rates",
        "status": "VARIABLE",
        "value": "Range 2.69% - 3.50%",
        "action_required": "Verify employee's specific provider rate in system"
      }
    ]
  }
}
