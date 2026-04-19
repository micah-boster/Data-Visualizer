SELECT partner_name, SUM(total_collected_lifetime) AS total
FROM agg_batch_performance_summary
GROUP BY partner_name
