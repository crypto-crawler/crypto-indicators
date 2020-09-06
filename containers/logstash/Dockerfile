FROM logstash:7.9.1

RUN bin/logstash-plugin install logstash-output-influxdb

COPY ./config/logstash.yml /usr/share/logstash/config/logstash.yml
COPY ./pipeline/logstash.conf /usr/share/logstash/pipeline/logstash.conf
