---
title: "Automated backups: binary backup, export, scheduler и хранение вне роутера"
date: 2026-04-01
summary: "Automated backups для MikroTik: binary backup, export, scheduler, external storage, retention и restore testing."
tags: ["mikrotik","routeros","backup","automation"]
topics: ["networking"]
toc: true
---

# Automated backups: binary backup, export, scheduler и хранение вне роутера

Backup нужен не тогда, когда все работает, а когда вы ошиблись, устройство умерло или обновление пошло не так. На MikroTik важно различать binary backup и `/export`.

Нормальная стратегия включает автоматическое создание, хранение вне роутера, проверку восстановления и контроль успешности.

## Где это находится в общей архитектуре

Мы уже построили сложную конфигурацию: VLAN, firewall, NAT, WireGuard, DNS, monitoring. Потерять ее без backup - недопустимо.

Disaster recovery в следующей статье будет опираться на то, что backup/export уже есть.

## Binary backup и export

Binary backup:

- подходит для восстановления на том же устройстве;
- может содержать чувствительные данные;
- зависит от модели/версии;
- удобен для быстрого rollback.

`/export`:

- читаемый текст;
- удобен для аудита;
- лучше для переноса логики на другую модель;
- sensitive values могут быть скрыты или показаны в зависимости от параметров.

Нужны оба.

## Перед применением

Перед настройкой automation:

```routeros
/system backup save name=before-backup-automation
/export file=before-backup-automation
```

Определите, куда выгружать файлы: SFTP/SCP, FTP только в доверенной сети, SMB, внешний collector или ручной pull. Не храните единственную копию на роутере.

## Ручной backup

```routeros
/system backup save name=manual-backup
/export file=manual-export
```

Если нужен export с sensitive для закрытого хранилища, используйте соответствующие параметры RouterOS осознанно и защищайте файл как секрет.

## Scheduler

Примерная логика scheduler:

```routeros
/system scheduler
add name=nightly-export interval=1d start-time=03:00:00 on-event="/export file=nightly-export"
```

Для production этого мало: нужно имя с датой, upload наружу, обработка ошибок и логирование результата.

## Upload наружу

Скрипт должен:

- создать backup/export;
- выгрузить файл на внешний host;
- записать success/failure в log;
- не хранить секреты в открытом виде без необходимости;
- по возможности чистить старые локальные файлы.

RouterOS scripting чувствителен к синтаксису. Проверяйте скрипты на тестовом устройстве.

## Хранение и retention

Практичная схема:

- daily exports за 7-14 дней;
- weekly backups за 1-3 месяца;
- копия перед крупными изменениями;
- отдельное хранение перед RouterOS upgrade;
- доступ только администраторам.

Backup без retention превращается либо в мусор, либо в единственный старый файл.

## Restore testing

Непроверенный backup - это предположение. Периодически проверяйте:

- файл создается;
- файл выгружается;
- файл читается;
- export можно применить по частям на тестовом CHR;
- binary backup подходит для конкретного устройства.

## Как проверить результат

Проверки:

```routeros
/file print
/system scheduler print
/log print
```

Снаружи:

- backup появился в хранилище;
- имя содержит дату/устройство;
- размер файла не нулевой;
- права доступа ограничены;
- monitoring видит last success.

## Частые ошибки

Хранить backup только на роутере.

Делать только binary backup и не иметь readable export.

Не логировать failure upload.

Коммитить export с secrets в git.

Никогда не проверять restore.

## Security notes

Backup может содержать ключи, пароли, WireGuard private keys, VPN secrets и внутреннюю топологию. Это секретный артефакт.

Хранилище backup должно быть защищено не хуже самого роутера.

## Мини-вывод

Automated backups - это binary backup, export, расписание, external storage, retention, logs и restore testing. Файл на самом роутере не считается достаточной защитой.

Следующая статья будет про disaster recovery.
