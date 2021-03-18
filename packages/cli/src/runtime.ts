import * as fs from 'fs-extra';
import { PipelineMeta } from '@pipcook/core';
import { Costa } from '@pipcook/costa';
import * as path from 'path';
import { createStandaloneRT } from './standalone-impl';
import { logger, Framework, Plugin, Script } from './utils';

/**
 * runtime for standalone environment,
 * input pipeline configuration file, run the pipeline
 */
export class StandaloneRuntime {
  // script directory
  private scriptDir: string;

  // model directory
  private modelDir: string;

  // cache directory
  private cacheDir: string;

  // data directory
  private dataDir: string;

  // framework directory, linked from global framework cache directory
  private frameworkDir: string;

  constructor(
    workspaceDir: string,
    private pipelineMeta: PipelineMeta,
    private enableCache = true
  ) {
    this.scriptDir = path.join(workspaceDir, 'scripts');
    this.dataDir = path.join(workspaceDir, 'data');
    this.modelDir = path.join(workspaceDir, 'model');
    this.cacheDir = path.join(workspaceDir, 'cache');
    this.frameworkDir = path.join(workspaceDir, 'framework');
  }

  async prepareWorkspace(): Promise<void> {
    await Promise.all([
      fs.mkdirp(this.scriptDir),
      fs.mkdirp(this.dataDir),
      fs.mkdirp(this.modelDir),
      fs.mkdirp(this.cacheDir)
    ]);
  }

  async run(): Promise<void> {
    await this.prepareWorkspace();
    logger.info('preparing framework');
    const framework = await Framework.prepareFramework(this.pipelineMeta, this.frameworkDir, this.enableCache);
    logger.info('preparing scripts');
    const scripts = await Script.prepareScript(this.pipelineMeta, this.scriptDir, this.enableCache);
    logger.info('preparing artifact plugins');
    const artifactPlugins = await Plugin.prepareArtifactPlugin(this.pipelineMeta);
    const costa = new Costa({
      workspace: {
        dataDir: this.dataDir,
        modelDir: this.modelDir,
        cacheDir: this.cacheDir,
        frameworkDir: this.frameworkDir
      },
      framework
    });
    logger.info('initializing framework packages');
    await costa.initFramework();
    logger.info('running data source script');
    let dataSource = await costa.runDataSource(scripts.dataSource, this.pipelineMeta.options);
    logger.info('running data flow script');
    if (scripts.dataflow) {
      dataSource = await costa.runDataflow(dataSource, scripts.dataflow);
    }
    logger.info('running model script');
    const standaloneRT = createStandaloneRT(dataSource, this.pipelineMeta, this.modelDir);
    await costa.runModel(standaloneRT, scripts.model, this.pipelineMeta.options);
    logger.info(`pipeline finished, the model has been saved at ${this.modelDir}`);
    for (const artifact of artifactPlugins) {
      logger.info(`running artifact ${artifact.options.processor}`);
      await artifact.artifactExports.build(this.modelDir, artifact.options);
      logger.info('done');
    }
  }
}
