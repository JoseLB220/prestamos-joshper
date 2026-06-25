import { query } from '../lib/pg'
import saveDataUrlToPublicUploads from '../lib/saveDataUrl'

async function migrateDataUrls() {
    try {
        console.log('Iniciando migración de data URLs...')

        // Buscar usuarios con data URLs en documento_foto
        const userResults = await query(
            `SELECT id, documento_foto FROM users 
             WHERE documento_foto LIKE 'data:image%'`
        )

        console.log(`Encontrados ${userResults.rows.length} usuarios con data URLs`)

        // Migrar documento_foto de usuarios
        for (const user of userResults.rows) {
            try {
                if (user.documento_foto && user.documento_foto.startsWith('data:image')) {
                    const newUrl = await saveDataUrlToPublicUploads(user.documento_foto, 'doc')
                    await query(
                        `UPDATE users 
                         SET documento_foto = $1,
                             document_migrated = TRUE
                         WHERE id = $2`,
                        [newUrl, user.id]
                    )
                    console.log(`✅ Usuario ${user.id}: documento_foto migrado`)
                }
            } catch (err) {
                console.error(`❌ Error migrando usuario ${user.id}:`, err)
            }
        }

        // Buscar solicitudes de préstamo con data URLs
        const loanResults = await query(
            `SELECT id, documento_foto FROM loan_applications 
             WHERE documento_foto LIKE 'data:image%'`
        )

        console.log(`Encontradas ${loanResults.rows.length} solicitudes con data URLs`)

        // Migrar documento_foto de solicitudes
        for (const loan of loanResults.rows) {
            try {
                if (loan.documento_foto && loan.documento_foto.startsWith('data:image')) {
                    const newUrl = await saveDataUrlToPublicUploads(loan.documento_foto, 'doc')
                    await query(
                        `UPDATE loan_applications 
                         SET documento_foto = $1
                         WHERE id = $2`,
                        [newUrl, loan.id]
                    )
                    console.log(`✅ Solicitud ${loan.id}: documento_foto migrado`)
                }
            } catch (err) {
                console.error(`❌ Error migrando solicitud ${loan.id}:`, err)
            }
        }

        // Buscar pagos con data URLs en receipt_url
        const paymentResults = await query(
            `SELECT id, receipt_url FROM payments 
             WHERE receipt_url LIKE 'data:image%'`
        )

        console.log(`Encontrados ${paymentResults.rows.length} pagos con data URLs`)

        // Migrar receipt_url de pagos
        for (const payment of paymentResults.rows) {
            try {
                if (payment.receipt_url && payment.receipt_url.startsWith('data:image')) {
                    const newUrl = await saveDataUrlToPublicUploads(payment.receipt_url, 'receipts')
                    await query(
                        `UPDATE payments 
                         SET receipt_url = $1
                         WHERE id = $2`,
                        [newUrl, payment.id]
                    )
                    console.log(`✅ Pago ${payment.id}: receipt_url migrado`)
                }
            } catch (err) {
                console.error(`❌ Error migrando pago ${payment.id}:`, err)
            }
        }

        console.log('✨ Migración completada')
    } catch (error) {
        console.error('Error durante la migración:', error)
        process.exit(1)
    }
}

migrateDataUrls()