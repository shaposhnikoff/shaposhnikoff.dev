---
title: "План адресации и VLAN-дизайн: сегменты, подсети и правила доступа"
date: 2026-03-14
summary: "Планирование VLAN ID, подсетей, gateway, DHCP, trunk/access-портов и матрицы доступа перед настройкой MikroTik."
tags: ["mikrotik","routeros","vlan","addressing"]
topics: ["networking"]
toc: true
---

# План адресации и VLAN-дизайн: сегменты, подсети и правила доступа

VLAN-дизайн - это не список красивых ID. Это документ, который объясняет, какие сегменты есть в сети, какие устройства в них живут, какие подсети используются и какие потоки доступа разрешены.

Если этот план не сделать до настройки bridge VLAN filtering, риск lockout и хаотичных firewall-правил резко растет.

## Где это находится в общей архитектуре

Мы уже определили MikroTik как core router. Теперь нужно подготовить L2/L3 карту: VLAN ID, имена интерфейсов, подсети, DHCP, gateway, SSID и security policy.

Следующая статья будет про bridge VLAN filtering. Там ошибки могут отключить управление устройством. Поэтому здесь мы заранее проектируем management path и trunk/access-порты.

## Что такое VLAN в этой серии

VLAN разделяет один физический L2-домен на несколько логических broadcast domains. У каждого VLAN может быть свой gateway на MikroTik, свой DHCP pool, свои firewall rules и свой уровень доверия.

Важно: VLAN не заменяет firewall. Она разделяет L2, но L3-доступ между VLAN контролируется router/firewall.

## Базовая таблица VLAN

Пример стартового плана:

| VLAN ID | Имя | Подсеть | Gateway | DHCP | Назначение |
| --- | --- | --- | --- | --- | --- |
| 10 | `mgmt` | `10.10.10.0/24` | `10.10.10.1` | Да/ограниченно | Router, switch, AP management |
| 20 | `lan` | `10.10.20.0/24` | `10.10.20.1` | Да | Trusted clients |
| 30 | `guest` | `10.10.30.0/24` | `10.10.30.1` | Да | Guest Wi-Fi |
| 40 | `iot` | `10.10.40.0/24` | `10.10.40.1` | Да | IoT devices |
| 50 | `server` | `10.10.50.0/24` | `10.10.50.1` | По ситуации | NAS, homelab services |

Используйте адресный план, который не конфликтует с VPN, офисами, облаками и будущими site-to-site связями. Сети вида `192.168.0.0/24` и `192.168.1.0/24` часто конфликтуют с чужими домашними сетями.

## Management VLAN

Management VLAN нужно проектировать первой. В ней живут:

- router management address;
- switch management;
- CAP/AP management;
- иногда controller или monitoring host.

Management не должен быть доступен из Guest и IoT. Из LAN доступ может быть ограничен только trusted-admin устройствами. Для удаленного доступа лучше использовать WireGuard.

## Trunk и access ports

Access port несет одну untagged VLAN для конечного устройства. Пример: порт для ПК в LAN VLAN.

Trunk port несет несколько tagged VLAN. Пример: uplink от router к managed switch или от switch к AP, где на AP есть несколько SSID.

PVID определяет, в какую VLAN попадет untagged traffic на порту. Ошибка с PVID часто приводит к тому, что устройство оказывается не в той сети.

## Таблица портов

Перед настройкой заполните карту портов:

| Устройство | Порт | Роль | Tagged VLAN | Untagged VLAN / PVID |
| --- | --- | --- | --- | --- |
| MikroTik router | `<trunk-to-switch>` | trunk | 10,20,30,40,50 | none или native по проекту |
| Switch | `<uplink-to-router>` | trunk | 10,20,30,40,50 | none или native по проекту |
| Switch | `<port-to-admin-pc>` | access | none | 20 |
| Switch | `<port-to-ap>` | trunk | 10,20,30,40 | 10 для management AP, если нужно |
| Switch | `<port-to-nas>` | access | none | 50 |

Не используйте реальные имена интерфейсов из примера без проверки устройства.

## Матрица доступа

Минимальная policy:

| From | To | Решение |
| --- | --- | --- |
| LAN | Internet | allow |
| LAN | Server | allow или ограниченно |
| LAN | IoT | allow only needed services |
| Guest | Internet | allow |
| Guest | LAN/Server/MGMT | deny |
| IoT | Internet | allow или ограниченно |
| IoT | LAN/MGMT | deny |
| MGMT | Network devices | allow |
| VPN | Internal networks | explicit allow only |

Эта таблица позже станет firewall rules. Если правило нельзя объяснить в таблице, его рано писать в RouterOS.

## Перед применением

VLAN-изменения опасны. Перед настройкой:

```routeros
/system backup save name=before-vlan-design
/export file=before-vlan-design
/system console safe-mode
```

Также нужен локальный доступ к роутеру или отдельный порт, который временно сохраняет management-доступ. Не включайте bridge VLAN filtering удаленно без rollback-плана.

## Практический naming convention

Рекомендуемые имена:

```text
br-core
vlan10-mgmt
vlan20-lan
vlan30-guest
vlan40-iot
vlan50-server
pool-lan
pool-guest
dhcp-lan
dhcp-guest
```

Имена должны совпадать с ролью, а не с текущей случайной схемой портов.

## Как проверить дизайн

До CLI-настройки проверьте:

- у каждой VLAN есть назначение;
- у каждой VLAN есть подсеть и gateway;
- понятно, где DHCP включен, а где нет;
- management path не зависит от непроверенного trunk;
- для каждого trunk указаны tagged VLAN;
- для каждого access port указан PVID;
- есть матрица доступа между сегментами;
- есть план отката.

## Частые ошибки

Включить VLAN filtering без management-плана. Это главный риск lockout.

Использовать VLAN 1 как неявную management-сеть без осознанного решения.

Создать VLAN, но забыть firewall policy. В результате все VLAN маршрутизируются друг к другу.

Назначать подсети без запаса и без учета VPN/site-to-site конфликтов.

## Security notes

Не делайте Guest и IoT "почти LAN". Если сегмент создан как менее доверенный, его default policy должна быть ограничительной.

Management VLAN должна быть самой защищенной внутренней сетью. Если IoT-камера может открывать WinBox роутера, VLAN-дизайн не выполняет свою функцию.

## Мини-вывод

Хороший VLAN-дизайн начинается на бумаге: ID, имена, подсети, порты, SSID, DHCP и матрица доступа. Только после этого имеет смысл включать bridge VLAN filtering.

Следующая статья будет про bridge VLAN filtering: trunk, access, PVID, bridge VLAN table и защиту от lockout.
