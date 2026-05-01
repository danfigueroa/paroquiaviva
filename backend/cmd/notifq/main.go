package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		fmt.Fprintln(os.Stderr, "DATABASE_URL not set")
		os.Exit(1)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		fmt.Fprintln(os.Stderr, "pool:", err)
		os.Exit(1)
	}
	defer pool.Close()

	fmt.Println("=== columns of notifications ===")
	rows, err := pool.Query(ctx, `
		SELECT column_name, data_type, is_nullable
		FROM information_schema.columns
		WHERE table_schema='public' AND table_name='notifications'
		ORDER BY ordinal_position
	`)
	if err != nil {
		fmt.Fprintln(os.Stderr, "cols:", err)
		os.Exit(1)
	}
	for rows.Next() {
		var name, dtype, nullable string
		_ = rows.Scan(&name, &dtype, &nullable)
		fmt.Printf("  %-22s %-30s nullable=%s\n", name, dtype, nullable)
	}
	rows.Close()

	fmt.Println("\n=== schema_migrations applied ===")
	mrows, err := pool.Query(ctx, `SELECT version, dirty FROM schema_migrations ORDER BY version`)
	if err != nil {
		fmt.Fprintln(os.Stderr, "migrations:", err)
	} else {
		for mrows.Next() {
			var v int64
			var d bool
			_ = mrows.Scan(&v, &d)
			fmt.Printf("  %d  dirty=%v\n", v, d)
		}
		mrows.Close()
	}

	var n int64
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM notifications`).Scan(&n); err == nil {
		fmt.Printf("\ncount(notifications) all-time: %d\n", n)
	}
}
