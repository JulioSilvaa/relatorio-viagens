#!/usr/bin/env bash
# Cria o banco de testes (vdr_test) junto com o banco principal na inicialização.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE DATABASE vdr_test;
EOSQL