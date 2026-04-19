SELECT partner_name, batch, total_accounts, batch_age_in_months
FROM agg_batch_performance_summary
WHERE account_type = 'Consumer'
  AND partner_name IN ('Acme', 'Globex')
  AND batch_age_in_months BETWEEN 3 AND 12
ORDER BY batch_age_in_months DESC
