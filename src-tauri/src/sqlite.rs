use libsql::{params::IntoParams, Builder, Connection, Database, Value};
use std::sync::Arc;
use tokio::sync::OnceCell;

pub struct SqliteDb {
    pub db: Arc<Database>,
    pub conn: Connection,
}

static INSTANCE: OnceCell<SqliteDb> = OnceCell::const_new();

impl SqliteDb {
    pub async fn instance() -> Result<&'static SqliteDb, Box<dyn std::error::Error>> {
        INSTANCE
            .get_or_try_init(|| async {
                let db = Builder::new_local("file:./db.sqlite").build().await?;

                let db = Arc::new(db);
                let conn = db.connect()?;

                // Verify connection works
                conn.query("select 1;", ()).await?;

                Ok(SqliteDb { db, conn })
            })
            .await
    }

    pub async fn execute(
        &self,
        query: &str,
        params: impl IntoParams,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut stmt = self.conn.prepare(query).await?;
        stmt.execute(params).await?;
        Ok(())
    }

    pub async fn query(
        &self,
        query: &str,
        params: impl IntoParams,
    ) -> Result<Vec<Vec<Value>>, Box<dyn std::error::Error>> {
        let mut stmt = self.conn.prepare(query).await?;
        let mut rows = stmt.query(params).await?;

        let mut results = Vec::new();
        while let Some(row) = rows.next().await? {
            let mut row_values = Vec::new();
            for i in 0..row.column_count() {
                row_values.push(row.get_value(i)?);
            }
            results.push(row_values);
        }

        Ok(results)
    }
}
