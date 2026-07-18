do $migration$
declare v_definition text;
begin
  select pg_get_functiondef('private.recommendation_execute(uuid,uuid,text)'::regprocedure)
    into v_definition;
  v_definition := replace(v_definition, '''productId'', v_candidate.product_uuid', '''product_id'', v_candidate.product_uuid');
  v_definition := replace(v_definition, '''partnerId'', v_candidate.partner_uuid', '''partner_id'', v_candidate.partner_uuid');
  v_definition := replace(v_definition, '''campaignId'', v_candidate.campaign_uuid', '''campaign_id'', v_candidate.campaign_uuid');
  v_definition := replace(v_definition, '''recommendationReasons'', v_recommendation_reasons', '''recommendation_reasons'', v_recommendation_reasons');
  v_definition := replace(v_definition, '''exclusionReasons'', v_exclusion_reasons', '''exclusion_reasons'', v_exclusion_reasons');
  v_definition := replace(v_definition, '''appliedRules'', v_applied_rules', '''applied_rules'', v_applied_rules');
  v_definition := replace(v_definition, '''displayOrder'', v_candidate.display_order', '''display_order'', v_candidate.display_order');
  execute v_definition;
end;
$migration$;
