SELECT partner_name, batch, total_accounts, batch_age_in_months
FROM agg_batch_performance_summary
WHERE account_type = 'Consumer'
ORDER BY batch_age_in_months DESC
