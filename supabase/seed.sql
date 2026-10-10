-- Aeko live demo — seed (idempotent upserts; safe to run repeatedly)
-- All companies, people, numbers, capabilities and certifications are fictional,
-- invented for this demo. Non-live supplier names are reused from
-- src/data/suppliers.js (read-only reference).
--
-- Ranking contract (api/_lib/matching.js): for the cookie brief the three
-- is_live_demo suppliers must rank top 3. Seeding guarantees this:
--   * no non-live supplier carries a 'stuffed cookies' capability or 'allergen'
--   * no non-live cookie supplier has a 'tunnel oven'
--   * non-live cookie suppliers stay under 500,000 capacity/month
--   * ties are broken toward is_live_demo suppliers

-- ---------------------------------------------------------------------------
-- Users (password for all = aeko2026)
-- ---------------------------------------------------------------------------
insert into users (id, email, password, role, name, company, supplier_id) values
  ('usr_maya',            'maya@doughmere.demo',  'aeko2026', 'BRAND',    'Maya Chen',     'Doughmere Cookie Co.',  null),
  ('usr_admin',           'admin@aekovera.demo',  'aeko2026', 'ADMIN',    'Aeko Control',  'Aekovera',              null),
  ('usr_sup_stonefurrow', 'ops@stonefurrow.demo', 'aeko2026', 'SUPPLIER', 'Supplier One',  'Stonefurrow Crumb Co.', 'sup_stonefurrow'),
  ('usr_sup_ridgeline',   'ops@ridgeline.demo',   'aeko2026', 'SUPPLIER', 'Supplier Two',  'Ridgeline Baking Co.',  'sup_ridgeline'),
  ('usr_sup_wheatwind',   'ops@wheatwind.demo',   'aeko2026', 'SUPPLIER', 'Supplier Three','Wheatwind Bakehouse',   'sup_wheatwind')
on conflict (id) do update set
  email = excluded.email, password = excluded.password, role = excluded.role,
  name = excluded.name, company = excluded.company, supplier_id = excluded.supplier_id;

-- ---------------------------------------------------------------------------
-- The 3 live demo suppliers (real people on their own laptops)
-- ---------------------------------------------------------------------------
insert into suppliers (id, name, location, email, category, capabilities, equipment, certifications, moq, capacity_per_month, languages, is_live_demo, talking_points) values
  ('sup_stonefurrow', 'Stonefurrow Crumb Co.', 'Lancaster, PA', 'sourcing@stonefurrow.demo', 'cookies',
   '["stuffed cookies","dedicated allergen room","flow-wrap"]', '["tunnel oven (40 m)","co-extruder"]', '[]',
   50000, 2000000, '["en"]', true,
   'You CAN do it: 40-metre tunnel oven, dedicated allergen room. Say yes and ask them to send the spec.'),
  ('sup_ridgeline', 'Ridgeline Baking Co.', 'Columbus, OH', 'sourcing@ridgeline.demo', 'cookies',
   '["seasonal tins","private label"]', '["rack ovens"]', '[]',
   10000, 150000, '["en","hi","mr"]', true,
   'You CANNOT: rack ovens only, can''t run 500k. Say no politely. Speak Hindi or Marathi if you like.'),
  ('sup_wheatwind', 'Wheatwind Bakehouse', 'Wichita, KS', 'sourcing@wheatwind.demo', 'cookies',
   '["crackers","flatbreads"]', '["tunnel oven"]', '[]',
   25000, 900000, '["en","mr"]', true,
   'MAYBE: you have a tunnel oven, but it''s only free from mid-November. Say you could do it if the timeline can move. Speak Marathi if you like.')
on conflict (id) do update set
  name = excluded.name, location = excluded.location, email = excluded.email, category = excluded.category,
  capabilities = excluded.capabilities, equipment = excluded.equipment, certifications = excluded.certifications,
  moq = excluded.moq, capacity_per_month = excluded.capacity_per_month, languages = excluded.languages,
  is_live_demo = excluded.is_live_demo, talking_points = excluded.talking_points;

-- ---------------------------------------------------------------------------
-- 25 non-live background suppliers across cookies / beverages / sauces /
-- snacks / packaging. Names reused from src/data/suppliers.js where possible.
-- ---------------------------------------------------------------------------
insert into suppliers (id, name, location, email, category, capabilities, equipment, certifications, moq, capacity_per_month, languages, is_live_demo, talking_points) values
  -- sauces -----------------------------------------------------------------
  ('sup_heartland',     'Heartland Culinary Works',     'Indianapolis, IN', 'sourcing@heartland-culinary.demo',      'sauces',   '["hot-fill sauce lines","pouch filling","private label"]',        '["hot-fill lines","kettles"]',            '["FDA","cGMP","Organic","SQF"]', 5000,  1200000, '["en"]', false, null),
  ('sup_pacific-coast', 'Pacific Coast Provisions',     'Portland, OR',     'sourcing@pacific-coast-provisions.demo','sauces',   '["hot-fill & retort","glass and pet bottling","shelf-stable sauces"]','["retort","glass bottling"]',        '["FDA","cGMP","SQF","Kosher"]',  10000, 2400000, '["en"]', false, null),
  ('sup_delta-sauce',   'Delta Sauce Co-Packers',       'Memphis, TN',      'sourcing@delta-sauce-copackers.demo',   'sauces',   '["hot sauce lines","spouted pouches","private label"]',           '["hot-fill lines"]',                      '["FDA","cGMP","Organic"]',       3500,   800000, '["en"]', false, null),
  ('sup_lone-star',     'Lone Star Foods Manufacturing','Dallas, TX',       'sourcing@lone-star-foods.demo',         'sauces',   '["hot-fill & aseptic","dressings & marinades","co-pack programs"]','["aseptic filler"]',                     '["FDA","cGMP","SQF"]',           8000,  1800000, '["en"]', false, null),
  ('sup_bayou',         'Bayou City Bottling',          'Houston, TX',      'sourcing@bayou-city-bottling.demo',     'sauces',   '["hot sauce lines","glass bottling","salsas & picante"]',         '["glass bottling"]',                      '["FDA","cGMP"]',                 6000,   650000, '["en"]', false, null),
  ('sup_cascade',       'Cascade Fill Systems',         'Boise, ID',        'sourcing@cascade-fill-systems.demo',    'sauces',   '["cold-fill dressings","spouted pouches","refrigerated sauces"]', '["cold-fill"]',                           '["FDA","Organic"]',             12000,   900000, '["en"]', false, null),
  ('sup_uinta',         'Uinta Sauce Works',            'Salt Lake City, UT','sourcing@uinta-sauce-works.demo',      'sauces',   '["small-batch sauces","bbq & marinades"]',                        '["kettles"]',                             '["FDA"]',                        2000,   300000, '["en"]', false, null),
  ('sup_chesapeake',    'Chesapeake Condiment Co.',     'Baltimore, MD',    'sourcing@chesapeake-condiment.demo',    'sauces',   '["condiments","mayo & dressings"]',                               '["cold-fill"]',                           '["FDA","cGMP","SQF"]',           9000,   500000, '["en"]', false, null),
  -- cookies (all under 500k/month; no tunnel ovens, no allergen room) ------
  ('sup_keystone',      'Keystone Culinary Group',      'Denver, CO',       'sourcing@keystone-culinary-group.demo', 'cookies',  '["sandwich cookies","shortbread","tray bakes"]',                  '["rotary ovens","wire-cut depositor"]',   '["FDA","SQF"]',                 20000,   420000, '["en"]', false, null),
  ('sup_sunbelt',       'Sunbelt Cuisine Labs',         'Atlanta, GA',      'sourcing@sunbelt-cuisine-labs.demo',    'cookies',  '["biscuits","seasonal tins"]',                                    '["rack ovens"]',                          '["FDA","cGMP"]',                15000,   260000, '["en"]', false, null),
  ('sup_new-england',   'New England Pantry Co-Packers','Portland, ME',     'sourcing@new-england-pantry.demo',      'cookies',  '["brownies","blondies","tray bakes"]',                            '["rack ovens","depositors"]',             '["FDA","Organic"]',             10000,   180000, '["en"]', false, null),
  ('sup_high-plains',   'High Plains Provisions',       'Amarillo, TX',     'sourcing@high-plains-provisions.demo',  'cookies',  '["crackers","flatbreads"]',                                       '["band ovens"]',                          '["FDA","SQF","Kosher"]',        25000,   350000, '["en"]', false, null),
  ('sup_copper-kettle', 'Copper Kettle Confections',    'Burlington, VT',   'sourcing@copper-kettle-confections.demo','cookies', '["shortbread","twice-baked"]',                                    '["rotary ovens"]',                        '["FDA"]',                        5000,   120000, '["en"]', false, null),
  ('sup_prairie-spark', 'Prairie Spark Biscuit Co.',    'Des Moines, IA',   'sourcing@prairie-spark-biscuit.demo',   'cookies',  '["biscuits","graham sheets"]',                                    '["rack ovens","cream depositors"]',       '["FDA","cGMP"]',                30000,   380000, '["en"]', false, null),
  ('sup_harbor-light',  'Harbor Light Bake Co.',        'Brunswick, ME',    'sourcing@harbor-light-bake.demo',       'cookies',  '["biscotti","twice-baked"]',                                      '["rack ovens"]',                          '["FDA","Kosher"]',               8000,   140000, '["en"]', false, null),
  -- snacks -----------------------------------------------------------------
  ('sup_mojave',        'Mojave Foods Corporation',     'Phoenix, AZ',      'sourcing@mojave-foods.demo',            'snacks',   '["tortilla chips","extruded snacks"]',                            '["extruders","fryers"]',                  '["FDA","cGMP","SQF"]',          20000,  1500000, '["en"]', false, null),
  ('sup_ozark',         'Ozark Fill & Pack',            'Springfield, MO',  'sourcing@ozark-fill-pack.demo',         'snacks',   '["trail mix","pouch filling"]',                                   '["vertical form-fill-seal"]',             '["FDA"]',                        4000,   700000, '["en"]', false, null),
  ('sup_saguaro',       'Saguaro Specialty Foods',      'Tucson, AZ',       'sourcing@saguaro-specialty-foods.demo', 'snacks',   '["protein bars","energy bites"]',                                 '["bar lines","slitters"]',                '["FDA","Organic"]',              6000,   450000, '["en"]', false, null),
  ('sup_summit-ridge',  'Summit Ridge Snack Works',     'Salt Lake City, UT','sourcing@summit-ridge-snack.demo',     'snacks',   '["crackers","pretzel pieces"]',                                   '["tunnel oven","seasoning tumblers"]',    '["FDA","SQF"]',                 18000,   400000, '["en"]', false, null),
  -- beverages ---------------------------------------------------------------
  ('sup_great-lakes',   'Great Lakes Provisions Co.',   'Cleveland, OH',    'sourcing@great-lakes-provisions.demo',  'beverages','["cold brew","ready-to-drink teas"]',                             '["brew lines","hot-fill bottling"]',      '["FDA","cGMP"]',                12000,   900000, '["en"]', false, null),
  ('sup_garden-state',  'Garden State Culinary',        'Newark, NJ',       'sourcing@garden-state-culinary.demo',   'beverages','["juices","smoothie bases"]',                                     '["pouch filling","cold-fill"]',           '["FDA","Organic","Kosher"]',     7000,   600000, '["en"]', false, null),
  ('sup_vela',          'Vela Beverage Co.',            'Austin, TX',       'sourcing@vela-beverage.demo',           'beverages','["sparkling drinks","canned mixers"]',                            '["canning line"]',                        '["FDA","SQF"]',                 15000,  1100000, '["en"]', false, null),
  ('sup_gulf-coast',    'Gulf Coast Foods',             'Mobile, AL',       'sourcing@gulf-coast-foods.demo',        'beverages','["sports drinks","syrups"]',                                      '["hot-fill bottling"]',                   '["FDA","cGMP"]',                10000,   800000, '["en"]', false, null),
  -- packaging ---------------------------------------------------------------
  ('sup_blue-ridge',    'Blue Ridge Packing Co.',       'Asheville, NC',    'sourcing@blue-ridge-packing.demo',      'packaging','["cartons","labels","shrink sleeves"]',                           '["shrink tunnel","die cutters"]',         '["FSC","ISO 9001"]',             3000,  2000000, '["en"]', false, null),
  ('sup_virginia',      'Virginia Kitchen Works',       'Richmond, VA',     'sourcing@virginia-kitchen-works.demo',  'packaging','["corrugate","display trays"]',                                   '["die cutters","gluers"]',                '["FSC","ISO 9001"]',             5000,  1500000, '["en"]', false, null)
on conflict (id) do update set
  name = excluded.name, location = excluded.location, email = excluded.email, category = excluded.category,
  capabilities = excluded.capabilities, equipment = excluded.equipment, certifications = excluded.certifications,
  moq = excluded.moq, capacity_per_month = excluded.capacity_per_month, languages = excluded.languages,
  is_live_demo = excluded.is_live_demo, talking_points = excluded.talking_points;
