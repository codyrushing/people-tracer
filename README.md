# people-tracer

# TOTAL OVERHAUL

The new BlazePose models are head and shoulders more accurate and performant than Bodypix. RIP Bodypix...

Here are the key takeaways from BlazePose from what i can tell so far:
  
* Like Bodypix, BlazePose does both pose estimation and human segmentation, but they have to be run as separate inference processes.  I think this might actually be better because I can disable one or the other, or run both in parallel.
* They have a JS runtime, and unlike the Bodypix TensorflowJS runtime, BlazePose performs well enough on non-specialized hardware.  On my 2014 Macbook Pro, I can run both the pose estimation and the segmentation at around 20 FPS on a 640x480 image.  This is huge.
* This opens up potentially doing the inference in the same machine as the app rendering, which is a pretty large win from a complexity standpoint.  No need for the Coral board, just a couple of cameras connected to a central machine via USB.  Since we wouldn't necessarily need to be sending data over the network between machines, this is a win and the rendered app will have greater access to the inferenced data (bitmap ImageData), but could also convert those ImageData to polyline contours.

BlazePose resources:
* Blog post: https://blog.tensorflow.org/2022/01/body-segmentation.html
* TFJS repo: 
  * https://github.com/tensorflow/tfjs-models/tree/master/body-segmentation
  * https://github.com/tensorflow/tfjs-models/tree/master/pose-detection
* Pose estimation: https://storage.googleapis.com/tfjs-models/demos/pose-detection/index.html?model=blazepose
* Segmentation: https://storage.googleapis.com/tfjs-models/demos/segmentation/index.html?model=blazepose

Open questions:
* If we centralize all inference into a single machine which is also rendering the app, can it handle two camera feeds simultaneously?  Could we use other software to compose those videos together into a single feed?  Or could we separate the inference from the rendering at the expense of greater complexity.
* Since the quality of the inference is high, can we use a lower resolution image?


Connecting to dev board via SSH:

```
ssh mendel@arid-snail
```

## TODO
* Have this app run the python inference program as a child process.
* Filter out any layers that do not have a pose keypoint located within them

## Notes
* Good discussion on different 2D rendering engines: https://news.ycombinator.com/item?id=23083730
* Drawing paths and simplifying https://github.com/pixijs/pixijs/issues/2674 https://www.npmjs.com/package/simplify-path

