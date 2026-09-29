-- Universidad del integrante: la necesita la carta de aceptación de
-- prácticas (junto con career, que ya existe). Texto libre; el propio
-- integrante la puede editar (no está en la lista bloqueada de
-- enforce_self_editable_columns), igual que career.
alter table team_members add column if not exists university text;
