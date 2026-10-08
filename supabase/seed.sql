-- Seed: Platter cafe, settings, 16 benches, menu transcribed from the printed menu.
-- Source of truth is the menu photos; duplicates between Breakfast and other pages are kept once.
-- Veg flags are inferred from names (eggs count as non-veg) and must be confirmed by the owner.
with c as (
  insert into public.cafes (slug, name) values ('platter', 'Platter Cafe & Restro') returning id
), s as (
  insert into public.settings (cafe_id, key, value)
  select c.id, v.key, v.value::jsonb from c, (values
    ('hours', '{"open":"11:00","close":"22:30","weekly_off":[]}'),
    ('tax', '{"gst_percent":5,"inclusive":false}'),
    ('contact', '{"phone":"+919829044442","whatsapp":"919829044442","email":"mshamama@hotmail.com","address":"Platter 9 (Lower Ground Floor), Rajasthan International Centre (RIC), Sansthan Path, JLN Marg, Jhalana Doongri, Jaipur, Rajasthan 302017","maps_url":"https://maps.app.goo.gl/yQWZKutQKqLdydDy7","instagram":"https://www.instagram.com/platter_cafe"}'),
    ('legal', '{"entity":"Kehwa","tagline":"A unit of Kehwa","fssai":"12223026002434","fssai_valid_to":"2026-12-30","gst_number":"08AARFK0670K1ZW"}'),
    ('flags', '{"delivery":false,"referrals":false,"popups":false,"loyalty":false,"blog":false}'),
    ('delivery', '{"base_fare":30,"base_km":2,"per_km":10,"max_km":8,"free_above":0,"min_order":0,"lat":26.8668664,"lng":75.8190989}'),
    ('ops', '{"prep_base_minutes":10,"per_order_minutes":2,"max_orders_per_bench_10min":6,"max_orders_cafe_10min":120,"enforce_hours":true}'),
    ('template', '{"name":"expressive"}')
  ) as v(key, value)
  on conflict (cafe_id, key) do update set value = excluded.value
), b as (
  insert into public.benches (cafe_id, number, label)
  select c.id, n, 'Table ' || n from c, generate_series(1, 16) n
), cat as (
  insert into public.categories (cafe_id, name, slug, sort, delivery_available)
  select c.id, v.name, v.slug, v.ord, v.delivery from c, (values
    ('Breakfast', 'breakfast', 1, false),
    ('Hot Coffee', 'hot-coffee', 2, true),
    ('Tea', 'tea', 3, true),
    ('Cold Brew', 'cold-brew', 4, true),
    ('Iced Tea & Sparkling', 'iced-tea-sparkling', 5, true),
    ('Frappes', 'frappes', 6, true),
    ('Shakes', 'shakes', 7, true),
    ('Soups', 'soups', 8, true),
    ('Veg Snacks', 'veg-snacks', 9, true),
    ('Non Veg Snacks', 'non-veg-snacks', 10, true),
    ('Salads', 'salads', 11, true),
    ('Sandwich, Burger & Wraps', 'sandwich-burger-wraps', 12, true),
    ('Pastas', 'pastas', 13, true),
    ('Bites from the World', 'bites', 14, true),
    ('Pizzas', 'pizzas', 15, true),
    ('Chinese', 'chinese', 16, true),
    ('Main Course', 'main-course', 17, true),
    ('Rice', 'rice', 18, true),
    ('Curd & Papad', 'curd-papad', 19, true),
    ('Breads', 'breads', 20, true),
    ('Non Veg', 'non-veg', 21, true),
    ('Eggs to Order', 'eggs', 22, true),
    ('Desserts', 'desserts', 23, true)
  ) as v(name, slug, ord, delivery)
  returning id, slug, cafe_id
)
insert into public.items (cafe_id, category_id, name, price, is_veg, sort)
select cat.cafe_id, cat.id, v.name, v.price, v.veg, v.ord
from cat join (
  select slug, name, price, veg, row_number() over () as ord from (values
    ('breakfast','Poha',80,true), ('breakfast','Toast with Butter and Jam',50,true), ('breakfast','Guacamole Toast',300,true),
    ('breakfast','Cheese Chilli Toast',210,true), ('breakfast','Coleslaw Sandwich',200,true), ('breakfast','PP Samosa',70,true),
    ('breakfast','Poori Bhaji',80,true), ('breakfast','Aloo Paratha',70,true), ('breakfast','Aloo Pyaaz Paratha',90,true),
    ('breakfast','Paneer Paratha',100,true), ('breakfast','Hashbrown with Fries',200,true), ('breakfast','Idli Sambhar',100,true),
    ('breakfast','Plain Dosa',120,true), ('breakfast','Masala Dosa',180,true), ('breakfast','Plain Uttapam',160,true),
    ('breakfast','Chilli Cheese Uttapam',180,true), ('breakfast','Onion Uttapam',170,true), ('breakfast','Fried Idli',150,true),
    ('breakfast','Classic Frappe',170,true),
    ('hot-coffee','Espresso',110,true), ('hot-coffee','Espresso Macchiato',130,true), ('hot-coffee','Americano',140,true),
    ('hot-coffee','Cappuccino',160,true), ('hot-coffee','Café Latte',170,true), ('hot-coffee','Flat White',180,true), ('hot-coffee','Café Mocha',180,true),
    ('tea','Masala Chai',50,true), ('tea','Ginger Tea',60,true), ('tea','Green Tea',60,true), ('tea','Lemon & Honey Tea',70,true),
    ('cold-brew','Iced Americano',140,true), ('cold-brew','Iced Cappuccino',160,true), ('cold-brew','Iced Latte',170,true),
    ('cold-brew','Iced Mocha',180,true), ('cold-brew','Vietnamese Cold Brew',190,true),
    ('iced-tea-sparkling','Lemon Iced Tea',140,true), ('iced-tea-sparkling','Peach Iced Tea',150,true), ('iced-tea-sparkling','Virgin Mojito',130,true),
    ('iced-tea-sparkling','Green Apple Soda',120,true), ('iced-tea-sparkling','Fresh Lime Soda / Water',100,true), ('iced-tea-sparkling','Raspberry Bliss',180,true),
    ('frappes','Iced Café Royale',170,true), ('frappes','Frappe Choco Blast',190,true), ('frappes','Cream & Oreo Frappe',180,true),
    ('shakes','Belgian Chocolate Shake',250,true), ('shakes','Nutella Shake',260,true), ('shakes','Biscoff Shake',240,true),
    ('shakes','Oreo / Kit Kat / Caramel Shake',200,true), ('shakes','Strawberry / Vanilla / Mango Shake',200,true),
    ('soups','Tomato Soup',180,true), ('soups','Hot N Sour Soup',180,true), ('soups','Lemon Coriander Soup',160,true), ('soups','Sweet Corn Soup',150,true),
    ('veg-snacks','Paneer Tikka',300,true), ('veg-snacks','Tandoori Aloo',230,true), ('veg-snacks','Dahi Kebab',260,true), ('veg-snacks','Hara Bhara Kebab',220,true),
    ('non-veg-snacks','Chicken Tikka',360,false), ('non-veg-snacks','Malai Chicken Tikka',380,false), ('non-veg-snacks','Fish Tikka',350,false), ('non-veg-snacks','Fish Fingers',250,false),
    ('salads','Classic Greek Salad',390,true), ('salads','Caesar Salad',320,true), ('salads','Chicken Caesar Salad',460,false),
    ('salads','BBQ Cottage Cheese Salad',400,true), ('salads','BBQ Chicken Salad',460,false), ('salads','Crispy Pizza Salad',400,true),
    ('salads','Quinoa Salad',350,true), ('salads','Mexican Bean Salad',250,true), ('salads','Foxtail Millet Salad',350,true), ('salads','Green Salad',70,true),
    ('sandwich-burger-wraps','Veg Grilled Sandwich',280,true), ('sandwich-burger-wraps','Paneer Tikka Sandwich',300,true),
    ('sandwich-burger-wraps','Vegetable Quesadilla',350,true), ('sandwich-burger-wraps','Veg Fire House Burger',210,true), ('sandwich-burger-wraps','Veg Kathi Roll',170,true),
    ('pastas','Alfredo Pasta',399,true), ('pastas','Pasta Arrabiata',330,true), ('pastas','Spaghetti Primavera',350,true),
    ('pastas','Spaghetti AOP',399,true), ('pastas','Veg Lasagne',350,true), ('pastas','Baked Vegetables',410,true),
    ('bites','Cajun Spiced Potato Wedges',200,true), ('bites','Basil Tomato Crostini',220,true), ('bites','Classic French Fries',120,true),
    ('bites','Peri Peri Fries',130,true), ('bites','Cheese Garlic Bread',200,true), ('bites','Cheese Corn Balls',170,true),
    ('bites','Jalapeno Cheese Poppers',220,true), ('bites','Samosa',70,true),
    ('pizzas','Classico Margherita',280,true), ('pizzas','Simply Veg',325,true), ('pizzas','Pizza Ala Fungi',340,true),
    ('pizzas','Paneer Tikka Pizza',400,true), ('pizzas','Veg Supreme Pizza',420,true), ('pizzas','Pizza Puttanesca',425,true),
    ('pizzas','BBQ Cottage Cheese Pizza',450,true), ('pizzas','Herbed Margherita',300,true), ('pizzas','Fungi with Truffle Oil',475,true), ('pizzas','Quattro Formaggi',425,true),
    ('chinese','Chilli Paneer',220,true), ('chinese','Crispy Spring Rolls',170,true), ('chinese','Honey Chilli Potato',210,true),
    ('chinese','Crispy Corn',230,true), ('chinese','Veg Manchurian',280,true), ('chinese','Veg Fried Rice',150,true),
    ('chinese','Hakka Noodles',140,true), ('chinese','Chilli Garlic Noodles',175,true), ('chinese','Chilly Chicken',340,false), ('chinese','Kung Pao Chicken Bites',400,false),
    ('main-course','Dal Tadka',200,true), ('main-course','Dal Makhani',275,true), ('main-course','Paneer Lababdar',310,true),
    ('main-course','Paneer Butter Masala',290,true), ('main-course','Kadhai Paneer',320,true), ('main-course','Paneer Khurchan',300,true),
    ('main-course','Palak Paneer',290,true), ('main-course','Malai Kofta',300,true), ('main-course','Mix Veg',330,true),
    ('main-course','Aloo Pyaaz',250,true), ('main-course','Gatta Masala',290,true), ('main-course','Corn Palak',260,true),
    ('main-course','Matar Mushroom',360,true), ('main-course','Jeera Aloo',175,true), ('main-course','Methi Malai Matar',300,true), ('main-course','Bhindi Masala',300,true),
    ('rice','Plain Rice',115,true), ('rice','Jeera Rice',130,true), ('rice','Peas Pulao',140,true),
    ('rice','Veg Pulao',160,true), ('rice','Veg Biryani',200,true), ('rice','Chicken Biryani',300,false),
    ('curd-papad','Masala Chaach',30,true), ('curd-papad','Plain Curd',50,true), ('curd-papad','Boondi Raita',60,true),
    ('curd-papad','Mix Veg Raita',70,true), ('curd-papad','Pineapple Raita',85,true), ('curd-papad','Plain Papad',20,true), ('curd-papad','Masala Papad',25,true),
    ('breads','Tawa Roti',30,true), ('breads','Tawa Roti Butter',35,true), ('breads','Tandoori Roti',35,true),
    ('breads','Tandoori Roti Butter',45,true), ('breads','Lachha Paratha',60,true), ('breads','Plain Naan',60,true), ('breads','Butter / Garlic Naan',75,true),
    ('non-veg','Fish N Chips',300,false), ('non-veg','Butter Chicken',380,false), ('non-veg','Lal Maas',575,false),
    ('non-veg','Bhuna Gosht',550,false), ('non-veg','Mutton Roghan Josh',600,false),
    ('eggs','Plain Omelette',80,false), ('eggs','Masala Omelette',140,false), ('eggs','Cheese Omelette',160,false),
    ('eggs','Fried Eggs (Sunny Side Up)',130,false), ('eggs','Scrambled Eggs',150,false), ('eggs','French Toast',175,false), ('eggs','Boiled Eggs',60,false),
    ('desserts','Chocolate Brownie',160,true), ('desserts','Brownie with Ice Cream',200,true), ('desserts','Flavoured Kulfi',90,true),
    ('desserts','Gulab Jamun (2 pcs)',90,true), ('desserts','Gulab Jamun with Vanilla',120,true), ('desserts','Ice Cream',80,true),
    ('desserts','Seasonal Halwa',100,true), ('desserts','Waffle with Chocolate Sauce',220,true), ('desserts','Waffle with Ice Cream',250,true)
  ) as t(slug, name, price, veg)
) v on v.slug = cat.slug;

-- Variants: items sold in more than one form at the printed price.
insert into public.item_variants (cafe_id, item_id, name, price, sort)
select i.cafe_id, i.id, v.name, v.price, v.ord
from public.items i join (values
  ('Butter Chicken','Half',380,1), ('Butter Chicken','Full',750,2),
  ('Chilli Paneer','Dry',220,1), ('Chilli Paneer','Gravy',220,2),
  ('Veg Manchurian','Dry',280,1), ('Veg Manchurian','Gravy',280,2),
  ('Butter / Garlic Naan','Butter',75,1), ('Butter / Garlic Naan','Garlic',75,2),
  ('Oreo / Kit Kat / Caramel Shake','Oreo',200,1), ('Oreo / Kit Kat / Caramel Shake','Kit Kat',200,2), ('Oreo / Kit Kat / Caramel Shake','Caramel',200,3),
  ('Strawberry / Vanilla / Mango Shake','Strawberry',200,1), ('Strawberry / Vanilla / Mango Shake','Vanilla',200,2), ('Strawberry / Vanilla / Mango Shake','Mango',200,3)
) as v(item, name, price, ord) on v.item = i.name;
