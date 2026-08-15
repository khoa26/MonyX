FROM neo4j:5.20.0

WORKDIR /var/lib/neo4j

# Copy dump data & entrypoint script
COPY ./dumps ./dumps
COPY entrypoint.sh /custom-entrypoint.sh

USER root
RUN chmod +x /custom-entrypoint.sh

USER neo4j
ENTRYPOINT ["/custom-entrypoint.sh"]