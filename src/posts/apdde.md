---
title: Autonomous Pedestrian Detection with Depth Estimation
description: A lightweight embedded-vision system that pairs object recognition with depth information for vehicle decision-making.
readTime: 2 min read
tags:
  - Embedded Machine Learning
  - TensorFlow Lite
  - Stereo Vision
  - Embedded Linux
draft: false
image: /images/portfolio/apdde.png
gallery: /images/portfolio/gallery/APDde.gif
order: 3
links:
  - label: Repository
    url: https://github.com/vR00TB33R/APDde
  - label: E-kart integration repository
    url: https://github.com/vR00TB33R/APDde-ekart
  - label: APDde paper
    url: /pdfs/2023-APDde.pdf
---

APDde runs a lightweight neural network on Linux and embedded hardware to identify objects and estimate their distance. The prototype achieved greater than 99 percent inference accuracy while expanding detection beyond pedestrians to additional classes useful for autonomous vehicle decisions.

The first iteration used a pair of Logitech cameras for stereo depth. The work then moved toward a more robust, off-the-shelf sensing configuration and was integrated with the electric go-kart capstone platform.
