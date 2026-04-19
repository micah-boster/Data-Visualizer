SELECT partner_name, batch
FROM agg_batch_performance_summary
WHERE account_type = {{type}}
[[ AND batch_age_in_months > {{min_age}} ]]
