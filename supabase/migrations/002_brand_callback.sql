-- Brand callback: admin approves → Aeko calls the brand back with the options.
alter table project_requests add column if not exists callback_status text;   -- null | READY | CALLING | DONE
alter table project_requests add column if not exists summary jsonb;           -- { options, declined, callsMade, approvedAt }
alter table project_requests add column if not exists chosen_supplier_id text;

-- Languages for the demo: English + Hindi + Marathi (Norwegian dropped).
update suppliers set languages = '["en","hi","mr"]',
  talking_points = 'You CANNOT: rack ovens only, can''t run 500k. Say no politely. Speak Hindi or Marathi if you like.'
  where id = 'sup_ridgeline';
update suppliers set languages = '["en","mr"]',
  talking_points = 'MAYBE: you have a tunnel oven, but it''s only free from mid-November. Say you could do it if the timeline can move. Speak Marathi if you like.'
  where id = 'sup_wheatwind';
