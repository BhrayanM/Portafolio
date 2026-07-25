# Lecciones Aprendidas — ETAPA B

## Formato

```
| Fecha | Fase | Problema | Causa Raiz | Solucion | Verificacion | Prevencion | Recomendaciones |
```

---

| Fecha | Fase | Problema | Causa Raiz | Solucion | Verificacion | Prevencion | Recomendaciones |
|---|---|---|---|---|---|---|---|
| 2026-07-25 | 5 | Webhook-waiting HOT ignoraba `approved=true` | Check Approval solo revisaba `data.approved` y `data.body?.approved`. GET con query params entrega `data.query.approved` como string. | Check Approval ahora acepta `data.query?.approved === 'true'` ademas de `data.approved` y `data.body?.approved`. | Execution 48 HOT: status=success, lead_log id=4 status=approved. | Probar siempre resume via GET query params en nodos Wait. Documentar formato de datos segun metodo HTTP. | Si se usa GET para reanudar, parsear tambien `data.query`. Si se usa POST, parsear `data.body`. |
| 2026-07-25 | 5 | COLD leads asignaban `UNQUALIFIED` en hs_lead_status | `leadStatus` mapeaba `COLD:'UNQUALIFIED'` por decision temprana, pero UNQUALIFIED debe reservarse para spam/descartados. | Cambiado a `COLD:'OPEN'` en el nodo Upsert HubSpot. | lead_log id=5 (COLD): status=cold, HubSpot contact creado. | Definir semantica de hs_lead_status al inicio: NEW=HOT, OPEN=WARM+COLD, UNQUALIFIED=spam. | Consensuar mapeo con CRM antes de implementar. |
| 2026-07-25 | 5 | Postgres nodo insertaba NULL en email | `resolveData=true` en HubSpot reemplazaba el item, y Postgres leia `$json.email` del item sustituto. | Postgres ahora referencia `$('Parse AI Response').item.json.email` en lugar de `$json.email`. | lead_log con datos completos tras correccion. | Usar `$('node').item.json` en lugar de `$json` cuando haya nodos con `resolveData=true` antes del Postgres. | Documentar efecto colateral de resolveData en node Reference. |
