# Runbook: facturación y presupuesto

**Por qué importa:** un solo proyecto GCP (`secid-org`) sirve beta y
producción. Si la facturación se cae, **las dos** se caen. Ya pasó: la
prueba gratuita expiró y todas las Cloud Functions respondieron 503 durante
~7 semanas sin que nadie se enterara (el registro fallaba con
`auth/error-code:-47`).

## A. Alerta de presupuesto (una vez, consola, 5 min)

1. https://console.cloud.google.com/billing → selecciona la cuenta de
   facturación de `secid-org` → **Budgets & alerts** → **Create budget**.
2. Scope: proyecto `secid-org`. Amount: _Specified amount_, p. ej. **$20 USD/mes**
   (el gasto real es de centavos; la alerta es para detectar anomalías).
3. Thresholds: 50 %, 90 %, 100 % del real.
4. Notifications: marca _Email alerts to billing admins and users_; agrega el
   correo del operador si no es admin de facturación.
5. Guarda. Verifica: llega el correo de confirmación de GCP.

Equivalente por CLI (si prefieres):

```bash
ACC=$(gcloud billing projects describe secid-org --format='value(billingAccountName)' | sed 's#billingAccounts/##')
gcloud billing budgets create --billing-account="$ACC" --display-name="secid-org monthly" \
  --budget-amount=20USD --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 --threshold-rule=percent=1.0 \
  --filter-projects=projects/secid-org
```

## B. Notificaciones de la cuenta de facturación

Billing → **Account management** → _Payments users / Notifications_: el
operador debe recibir avisos de pago fallido y de cambios de estado de la
cuenta. Verifica que haya al menos un correo que alguien lea.

## C. Síntoma: todo el backend responde 503

Diagnóstico rápido:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'Content-Type: application/json' \
  --data '{"data":{}}' https://us-central1-secid-org.cloudfunctions.net/completeRegistration
curl -s -o /dev/null -w '%{http_code}\n' https://us-central1-secid-org.cloudfunctions.net/noSuchFunction
```

- `400`/`401` en la primera → backend sano.
- `503` en la primera y `404` en la segunda → **el proyecto está muerto, no el
  código** (facturación o cuota). Hosting y reglas siguen desplegando, así
  que beta "se ve viva".

Causas y arreglo:

| Causa                                | Cómo se ve                                                                 | Arreglo                                                                        |
| ------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Prueba gratuita expirada / sin Blaze | Deploy Beta falla con `Extensions require the Blaze plan`                  | Console → Billing → **Activate full account** (1 clic). No hay que redesplegar |
| Pago rechazado                       | Correo de GCP; mismo 503 generalizado                                      | Billing → Payment method → actualizar tarjeta                                  |
| Cuota de CPU de Cloud Run excedida   | Deploy falla con `Quota exceeded for total allowable CPU`; 503/429 ~30 min | Confirmar `cpu: 'gcf_gen1'` en `functions/src/init.ts`; esperar; redesplegar   |

Después del arreglo, verifica con el smoke test:

```bash
scripts/ci/smoke-test.sh https://beta.secid.mx https://us-central1-secid-org.cloudfunctions.net
```
