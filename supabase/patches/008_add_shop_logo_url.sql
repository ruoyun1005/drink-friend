-- 品牌 logo：讓每家店可以放自己的 logo 圖片網址，前端顯示用。
alter table shops add column if not exists logo_url text;
