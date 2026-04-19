SELECT a.partner_name, a.batch
FROM agg_batch_performance_summary a
JOIN (SELECT partner_name FROM agg_batch_performance_summary) b ON a.partner_name = b.partner_name
