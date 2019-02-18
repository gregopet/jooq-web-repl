#!/bin/sh
# Increases performance of writes but risks data corruption
# May be used for data that is easily reproducible
echo 'fsync false' >> /etc/postgresql/postgresql.conf
echo 'full_page_rewrites false' >> /etc/postgresql/postgresql.conf
