FROM openjdk:8-jre-alpine

ARG user=jenkins
ARG group=jenkins
ARG uid=1000
ARG gid=1000
ARG http_port=8080
ARG agent_port=50000

ENV JAVA_OPTS -Djava.awt.headless=true
ENV JENKINS_HOME /var/jenkins_home
ENV JENKINS_AGENT_PORT ${agent_port}
ENV EVERGREEN_ENDPOINT=http://127.0.0.1:9292
ENV COPY_REFERENCE_FILE_LOG $JENKINS_HOME/copy_reference_file.log
COPY scripts/init.groovy.d /usr/share/jenkins/ref/init.groovy.d

# Jenkins home directory is a volume, so configuration and build history
# can be persisted and survive image upgrades
VOLUME ${JENKINS_HOME}

# for main web interface:
EXPOSE ${http_port}
# will be used by attached agents:
EXPOSE ${agent_port}


# FIXME REMOVE (to ease iteration/speed just for now), see also shim-startup-wrapper.sh
RUN wget --quiet http://mirrors.jenkins.io/war-stable/latest/jenkins.war -O /usr/share/jenkins/jenkins.war
RUN apk add --no-cache curl # used by shim-startup-wrapper.sh

# Add the system dependencies for running Jenkins effectively
#
# The only dependencies for Jenkins Essentials are:
#   * supervisor
#   * nodejs
RUN apk add --no-cache git \
                        openssh-client \
                        unzip \
                        bash \
                        supervisor \
                        nodejs \
                        ttf-dejavu

# TODO: add a checksum check?
RUN cd /tmp && \
    wget https://download.docker.com/linux/static/stable/x86_64/docker-17.12.1-ce.tgz --output-document /tmp/docker.tar.gz && \
    tar xvzf docker.tar.gz && \
    mv docker/* /usr/local/bin && \
    rmdir docker && \
    rm docker.tar.gz



# Jenkins is run with user `jenkins`, uid = 1000
# If you bind mount a volume from the host or a data container,
# ensure you use the same uid
RUN addgroup -g ${gid} ${group} \
    && adduser -h "$JENKINS_HOME" -u ${uid} -G ${group} -s /bin/bash -D ${user}

#######################
## Construct the image
#######################

RUN mkdir -p /usr/local/bin
COPY build/jenkins.sh /usr/local/bin/
COPY build/jenkins-support /usr/local/bin/
COPY scripts/shim-startup-wrapper.sh /usr/local/bin

# Prepare the evergreen-client configuration
RUN mkdir -p /evergreen
COPY client /evergreen/client
COPY essentials.yaml /evergreen

# Ensure the supervisord configuration is copied and executed by default such
# that the Jenkins and evergreen-client processes both execute properly
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
CMD /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
