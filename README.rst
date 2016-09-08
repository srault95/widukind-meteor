=============================
Widukind Web (meteor.js release)
=============================

**Web UI for Widukind Project**

*Please ask your questions in the https://github.com/Widukind/widukind/issues repository.*


Installation
------------

::

    git clone https://github.com/srault95/widukind-meteor.git

    cd widukind-meteor

    docker build -t widukind-meteor .

    docker run -d --name mongodb mongo:3.2.7 mongod \
      --storageEngine wiredTiger \
      --wiredTigerDirectoryForIndexes \
      --directoryperdb --noauth

    docker run -d --name widukind-meteor \
      --link mongodb:mongodb \
      -p YOUR_PUBLIC_IP:80:80 \
      -e ROOT_URL=http://YOUR_PUBLIC_IP:80 \
      -e MONGO_URL=mongodb://mongodb/widukind \
      widukind-meteor

Load Datas
----------

::

    docker pull widukind/dlstats

    docker run -it --rm \
      --link mongodb:mongodb \
       -e WIDUKIND_MONGODB_URL=mongodb://mongodb/widukind \
       widukind/dlstats bash

    dlstats fetchers run --run-full --quiet -S -C -l INFO -B 200 --datatree -f ESRI


TODO
----

- Docker compose file